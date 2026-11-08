import { UnprocessableEntityException } from '@nestjs/common';
import { build, CAIXA, COUNTER } from './order-fakes.fixture.js';

/** 2× X Salada artesanal no pão tradicional (que tem baixa ligada). */
const TWO_ON_BUN = {
  ...COUNTER,
  items: [{ productId: 29, quantity: 2, choiceProductId: 65 }],
};

describe('OrderService: pão obrigatório do artesanal (2026-11-08)', () => {
  it('grava o pão como escolha, 1 por unidade, sem mudar o valor', async () => {
    const order = await build().service.create(CAIXA, TWO_ON_BUN);
    expect(order.amount).toBe('67.60');
    expect(order.items[0].choice).toMatchObject({
      productName: 'Pão Tradicional',
      quantity: 2,
      unitPrice: '0.00',
    });
    expect(order.items[0].addons).toEqual([]);
  });

  it('o pão escolhido baixa do estoque e entra no CMV', async () => {
    const { service, orders } = build();
    await service.create(CAIXA, TWO_ON_BUN);
    expect(orders.stockChanges[0]?.needs).toEqual([
      { supplyId: 20, milli: 2000 },
    ]);
    expect(orders.records[0].items[0].choice?.unitCmv).toBe('1.40');
  });

  it('artesanal sem pão é recusado com o nome do lanche e da categoria', async () => {
    const noBun = { ...COUNTER, items: [{ productId: 29, quantity: 1 }] };
    await expect(build().service.create(CAIXA, noBun)).rejects.toThrow(
      '"X Salada" precisa de 1 item da categoria "Pão"',
    );
  });

  it('pão num lanche sem escolha (o tradicional) é recusado', async () => {
    const wrongBun = {
      ...COUNTER,
      items: [{ productId: 9, quantity: 1, choiceProductId: 65 }],
    };
    await expect(build().service.create(CAIXA, wrongBun)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('artesanal gravado antes da regra passa na edição enquanto a linha não muda', async () => {
    const { service, catalog } = build();
    const artisanal = catalog.products.find((p) => p.id === 29)!;
    artisanal.choiceCategoryId = null;
    const before = { ...COUNTER, items: [{ productId: 29, quantity: 1 }] };
    const created = await service.create(CAIXA, before);
    artisanal.choiceCategoryId = 12;
    const sameLine = {
      ...before,
      items: [...before.items, { productId: 60, quantity: 1 }],
    };
    const updated = await service.replace(CAIXA, created.id, sameLine);
    expect(updated.items[0].choice).toBeNull();
    const changed = { ...COUNTER, items: [{ productId: 29, quantity: 2 }] };
    await expect(service.replace(CAIXA, created.id, changed)).rejects.toThrow(
      'precisa de 1 item da categoria "Pão"',
    );
  });
});
