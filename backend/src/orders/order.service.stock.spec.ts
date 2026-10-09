import { ADMIN, build, CAIXA, COUNTER } from './order-fakes.fixture.js';

const THREE_CANS = {
  ...COUNTER,
  items: [
    { productId: 9, quantity: 1 },
    { productId: 61, quantity: 3 },
  ],
};

describe('OrderService: baixa no estoque', () => {
  it('pedido do caixa de hoje baixa as bebidas (só os insumos com baixa)', async () => {
    const { service, orders } = build();
    await service.create(CAIXA, THREE_CANS);
    expect(orders.stockChanges).toEqual([
      { userId: CAIXA.id, needs: [{ supplyId: 30, milli: 3000 }] },
    ]);
  });

  it('editar o pedido de hoje troca a baixa pela nova', async () => {
    const { service, orders } = build();
    const created = await service.create(CAIXA, THREE_CANS);
    await service.replace(CAIXA, created.id, {
      ...THREE_CANS,
      items: [{ productId: 61, quantity: 1 }],
    });
    expect(orders.stockChanges[1]).toEqual({
      userId: CAIXA.id,
      needs: [{ supplyId: 30, milli: 1000 }],
    });
  });

  it('apagar o pedido de hoje devolve tudo (baixa vazia)', async () => {
    const { service, orders } = build();
    const created = await service.create(CAIXA, THREE_CANS);
    await service.remove(CAIXA, created.id);
    expect(orders.stockChanges[1]).toEqual({ userId: CAIXA.id, needs: [] });
  });

  it('caixa atrasado não mexe no estoque (nem ao editar ou apagar)', async () => {
    const { service, orders } = build();
    const created = await service.create(ADMIN, THREE_CANS);
    orders.records[0].closingId = 11; // fechamento de 2026-08-01
    await service.replace(ADMIN, created.id, THREE_CANS);
    await service.remove(ADMIN, created.id);
    expect(orders.stockChanges.slice(1)).toEqual([null, null]);
  });

  it('caixa de ontem lançado de madrugada ainda baixa', async () => {
    // 02h de 23/09: o caixa aberto ainda é o de 22/09.
    const { service, orders } = build(new Date('2026-09-23T05:00:00Z'));
    await service.create(CAIXA, THREE_CANS);
    expect(orders.stockChanges[0]?.needs).toEqual([
      { supplyId: 30, milli: 3000 },
    ]);
  });
});
