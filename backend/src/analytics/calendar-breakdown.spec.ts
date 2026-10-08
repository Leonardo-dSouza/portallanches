import { analyticsOrder } from './analytics.fixture.js';
import { dailySales, weekdaySales } from './calendar-breakdown.js';

// 2026-09-22 e 2026-09-29 são terças; 2026-09-25 é sexta.
const CLOSINGS = [
  { id: 1, businessDate: '2026-09-22' },
  { id: 2, businessDate: '2026-09-25' },
  { id: 3, businessDate: '2026-09-29' },
];
const ORDERS = [
  analyticsOrder('30.00', { closingId: 1 }),
  analyticsOrder('20.00', { closingId: 1 }),
  analyticsOrder('50.00', { closingId: 2 }),
];

describe('dailySales', () => {
  it('uma linha por dia com fechamento, inclusive o dia sem pedidos', () => {
    expect(dailySales(CLOSINGS, ORDERS)).toEqual([
      { businessDate: '2026-09-22', orders: 2, revenue: '50.00' },
      { businessDate: '2026-09-25', orders: 1, revenue: '50.00' },
      { businessDate: '2026-09-29', orders: 0, revenue: '0.00' },
    ]);
  });
});

describe('weekdaySales', () => {
  it('média por noite aberta de cada dia da semana, de segunda a domingo', () => {
    expect(weekdaySales(dailySales(CLOSINGS, ORDERS))).toEqual([
      {
        weekday: 2,
        nights: 2,
        orders: 2,
        revenue: '50.00',
        averageOrders: '1.0',
        averageRevenue: '25.00',
      },
      {
        weekday: 5,
        nights: 1,
        orders: 1,
        revenue: '50.00',
        averageOrders: '1.0',
        averageRevenue: '50.00',
      },
    ]);
  });
});
