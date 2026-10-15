import { orderFixture } from '../test-support/order-fixture';
import { filterCounts, isOpenAccount, matchesFilter } from './order-filters';

const ORDERS = [
  orderFixture({ id: 1, type: 'COUNTER', paymentMethodId: null }),
  orderFixture({ id: 2, type: 'DELIVERY', status: 'OUT_FOR_DELIVERY' }),
  orderFixture({ id: 3, type: 'COUNTER', status: 'DELIVERED' }),
  orderFixture({
    id: 4,
    type: null,
    paymentMethodId: null,
    status: 'DELIVERED',
  }),
];

describe('order-filters', () => {
  it('conta aberta = balcão sem forma (o importado da planilha não conta)', () => {
    expect(ORDERS.map(isOpenAccount)).toEqual([true, false, false, false]);
  });

  it('cada filtro e a contagem dele', () => {
    const ids = (filter: Parameters<typeof matchesFilter>[1]) =>
      ORDERS.filter((o) => matchesFilter(o, filter)).map((o) => o.id);
    expect(ids('open')).toEqual([1]);
    // "Em preparo" (2026-10-11): o que já saiu fica em Todos e Entregas.
    expect(ids('preparing')).toEqual([1]);
    expect(ids('delivery')).toEqual([2]);
    expect(ids('counter')).toEqual([1, 3]);
    expect(ids('all')).toEqual([1, 2, 3, 4]);
    expect(filterCounts(ORDERS)).toEqual({
      open: 1,
      preparing: 1,
      delivery: 1,
      counter: 2,
      all: 4,
      canceled: 0,
    });
  });

  it('o cancelado só aparece em Cancelados e não conta nos outros (2026-10-15)', () => {
    const canceled = orderFixture({
      id: 5,
      type: 'COUNTER',
      paymentMethodId: null,
      canceledAt: '2026-09-22T23:50:00Z',
      cancelReason: 'Cliente desistiu',
    });
    const orders = [...ORDERS, canceled];
    expect(matchesFilter(canceled, 'canceled')).toBe(true);
    expect(matchesFilter(canceled, 'all')).toBe(false);
    expect(matchesFilter(canceled, 'open')).toBe(false);
    expect(filterCounts(orders)).toMatchObject({
      all: 4,
      open: 1,
      canceled: 1,
    });
  });
});
