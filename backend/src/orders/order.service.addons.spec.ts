import { UnprocessableEntityException } from '@nestjs/common';
import { build, CAIXA, COUNTER } from './order-fakes.fixture.js';

/** 2× X Salada com bacon (1 por unidade) e "sem tomate". */
const WITH_BACON = {
  ...COUNTER,
  items: [
    {
      productId: 9,
      quantity: 2,
      note: 'sem tomate',
      addons: [{ productId: 33, quantity: 1 }],
    },
  ],
};

describe('OrderService: adicionais e observação', () => {
  it('o valor soma os adicionais (por unidade × a quantidade do item)', async () => {
    const order = await build().service.create(CAIXA, WITH_BACON);
    // 2 × 17,80 + 2 × 6,00
    expect(order.amount).toBe('47.60');
    expect(order.items[0]).toMatchObject({
      note: 'sem tomate',
      addons: [{ productName: 'Add bacon', quantity: 2, unitPrice: '6.00' }],
    });
  });

  it('adicional de outra categoria é recusado', async () => {
    const wrong = {
      ...COUNTER,
      items: [
        { productId: 9, quantity: 1, addons: [{ productId: 60, quantity: 1 }] },
      ],
    };
    await expect(build().service.create(CAIXA, wrong)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('adicional com baixa entra na baixa do pedido', async () => {
    const { service, catalog, orders } = build();
    const bacon = catalog.products.find((p) => p.id === 33)!;
    bacon.components = [{ ...bacon.components[0], deductOnSale: true }];
    await service.create(CAIXA, WITH_BACON);
    // 0,03 kg × 2 bacons
    expect(orders.stockChanges[0]?.needs).toEqual([
      { supplyId: 12, milli: 60 },
    ]);
  });

  it('editar mantém o preço da época do adicional', async () => {
    const { service, catalog } = build();
    const created = await service.create(CAIXA, WITH_BACON);
    catalog.products.find((p) => p.id === 33)!.salePrice = '9.00';
    const edited = await service.replace(CAIXA, created.id, WITH_BACON);
    expect(edited.items[0].addons[0].unitPrice).toBe('6.00');
  });
});
