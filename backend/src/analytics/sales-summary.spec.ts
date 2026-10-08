import { analyticsOrder, deliveryOrder } from './analytics.fixture.js';
import { percentChange, salesChanges, salesTotals } from './sales-summary.js';

const ANA = { id: 7, name: 'Ana' };

describe('salesTotals', () => {
  it('soma faturamento, pedidos, ticket médio, balcão, entregas e taxas em centavos', () => {
    const orders = [
      analyticsOrder('30.10'),
      deliveryOrder('45.20', 'Centro', ANA),
      deliveryOrder('20.00', 'Centro', ANA, { deliveryFee: '3.50' }),
      analyticsOrder('10.00', { type: null, paymentMethodId: null }),
    ];
    expect(salesTotals(orders)).toEqual({
      orders: 4,
      revenue: '105.30',
      averageTicket: '26.33',
      counter: 1,
      deliveries: 2,
      deliveryFees: '8.50',
    });
  });

  it('período sem pedidos: tudo zero, sem dividir por zero', () => {
    expect(salesTotals([])).toEqual({
      orders: 0,
      revenue: '0.00',
      averageTicket: '0.00',
      counter: 0,
      deliveries: 0,
      deliveryFees: '0.00',
    });
  });
});

describe('percentChange', () => {
  it('variação com 1 casa; null quando o anterior é zero', () => {
    expect(percentChange(110, 100)).toBe('10.0');
    expect(percentChange(90, 100)).toBe('-10.0');
    expect(percentChange(1, 3)).toBe('-66.7');
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe('salesChanges', () => {
  it('compara faturamento, pedidos, ticket e entregas com o período anterior', () => {
    const current = salesTotals([
      analyticsOrder('30.00'),
      deliveryOrder('30.00', 'Centro', ANA),
    ]);
    const previous = salesTotals([analyticsOrder('40.00')]);
    expect(salesChanges(current, previous)).toEqual({
      revenue: '50.0',
      orders: '100.0',
      averageTicket: '-25.0',
      deliveries: null,
    });
  });
});
