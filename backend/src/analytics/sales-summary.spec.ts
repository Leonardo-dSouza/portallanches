import {
  ANALYTICS_METHODS,
  analyticsOrder,
  deliveryOrder,
  NO_FIADO,
} from './analytics.fixture.js';
import {
  fiadoToReceive,
  percentChange,
  salesChanges,
  salesTotals,
} from './sales-summary.js';

const ANA = { id: 7, name: 'Ana' };

describe('salesTotals', () => {
  it('soma faturamento, pedidos, ticket médio, balcão, entregas e taxas em centavos', () => {
    const orders = [
      analyticsOrder('30.10'),
      deliveryOrder('45.20', 'Centro', ANA),
      deliveryOrder('20.00', 'Centro', ANA, { deliveryFee: '3.50' }),
      analyticsOrder('10.00', { type: null, paymentMethodId: null }),
    ];
    expect(salesTotals(orders, NO_FIADO)).toEqual({
      orders: 4,
      revenue: '105.30',
      averageTicket: '26.33',
      counter: 1,
      deliveries: 2,
      deliveryFees: '8.50',
    });
  });

  it('período sem pedidos: tudo zero, sem dividir por zero', () => {
    expect(salesTotals([], NO_FIADO)).toEqual({
      orders: 0,
      revenue: '0.00',
      averageTicket: '0.00',
      counter: 0,
      deliveries: 0,
      deliveryFees: '0.00',
    });
  });
});

describe('salesTotals com fiado (2026-11-01)', () => {
  const orders = [
    analyticsOrder('30.00'),
    analyticsOrder('20.00'),
    deliveryOrder('183.90', 'Centro', ANA, {
      paymentMethodId: 9,
      deliveryFee: '3.00',
    }),
  ];
  const received = {
    payments: [
      {
        amount: '100.00',
        extra: '10.00',
        paymentMethodId: 1,
        paymentMode: null,
      },
    ],
    methods: ANALYTICS_METHODS,
  };

  it('o fiado vendido conta nos pedidos e nas entregas, mas fica fora do faturamento', () => {
    expect(salesTotals(orders, NO_FIADO)).toMatchObject({
      orders: 3,
      revenue: '50.00',
      deliveries: 1,
      deliveryFees: '3.00',
    });
  });

  it('o ticket médio usa só os pedidos sem fiado', () => {
    expect(salesTotals(orders, NO_FIADO).averageTicket).toBe('25.00');
  });

  it('o recebido soma no faturamento com o adicional, sem mexer no ticket nem nos pedidos', () => {
    expect(salesTotals(orders, received)).toMatchObject({
      orders: 3,
      revenue: '160.00',
      averageTicket: '25.00',
    });
  });

  it('período só com fiado vendido: ticket zero, sem dividir por zero', () => {
    const onlyFiado = [analyticsOrder('40.00', { paymentMethodId: 9 })];
    expect(salesTotals(onlyFiado, NO_FIADO).averageTicket).toBe('0.00');
  });
});

describe('fiadoToReceive', () => {
  it('soma o que falta e ignora o quitado', () => {
    const balances = [
      { amount: '40.00', paid: '0.00' },
      { amount: '30.00', paid: '30.00' },
      { amount: '50.00', paid: '20.00' },
    ];
    expect(fiadoToReceive(balances)).toEqual({ count: 2, total: '70.00' });
  });

  it('sem fiado, zero', () => {
    expect(fiadoToReceive([])).toEqual({ count: 0, total: '0.00' });
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
    const current = salesTotals(
      [analyticsOrder('30.00'), deliveryOrder('30.00', 'Centro', ANA)],
      NO_FIADO,
    );
    const previous = salesTotals([analyticsOrder('40.00')], NO_FIADO);
    expect(salesChanges(current, previous)).toEqual({
      revenue: '50.0',
      orders: '100.0',
      averageTicket: '-25.0',
      deliveries: null,
    });
  });
});
