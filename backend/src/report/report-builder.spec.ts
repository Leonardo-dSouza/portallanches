import type { ClosingRecord } from '../closing/closing-repository.js';
import { buildClosingReport } from './report-builder.js';
import type {
  ReportOrderRow,
  ReportPaymentMethodRow,
} from './report-source.js';

const CLOSING: ClosingRecord = {
  id: 1,
  businessDate: '2026-09-22',
  status: 'OPEN',
  motoboyDailyRate: '40.00',
  closedById: null,
  closedAt: null,
  reopenedById: null,
  reopenedAt: null,
  notes: null,
};
const METHODS: ReportPaymentMethodRow[] = [
  { id: 1, name: 'PIX', sortOrder: 0 },
  { id: 2, name: 'Dinheiro', sortOrder: 1 },
  { id: 3, name: 'Crédito', sortOrder: 2 },
];
const ORDERS: ReportOrderRow[] = [
  { amount: '30.10', type: 'COUNTER', paymentMethodId: 1, deliveryFee: '0.00' },
  {
    amount: '45.20',
    type: 'DELIVERY',
    paymentMethodId: 1,
    deliveryFee: '3.00',
  },
  {
    amount: '20.00',
    type: 'DELIVERY',
    paymentMethodId: 2,
    deliveryFee: '5.50',
  },
];

function report(
  overrides: Partial<Parameters<typeof buildClosingReport>[0]> = {},
) {
  return buildClosingReport({
    closing: CLOSING,
    orders: ORDERS,
    expenseAmounts: ['120.00', '0.10'],
    paymentMethods: METHODS,
    ...overrides,
  });
}

describe('buildClosingReport', () => {
  it('soma o total e a quantidade de pedidos', () => {
    expect(report().orders).toEqual({ count: 3, total: '95.30' });
  });

  it('segmenta por forma de pagamento, omitindo as sem pedidos', () => {
    expect(report().byPaymentMethod).toEqual([
      { paymentMethodId: 1, name: 'PIX', ordersCount: 2, total: '75.30' },
      { paymentMethodId: 2, name: 'Dinheiro', ordersCount: 1, total: '20.00' },
    ]);
  });

  it('conta entregas e soma as taxas', () => {
    expect(report().delivery).toEqual({ count: 2, feesTotal: '8.50' });
  });

  it('custo do motoboy = diária + taxas de entrega', () => {
    expect(report().motoboy).toEqual({
      dailyRate: '40.00',
      deliveryFees: '8.50',
      totalCost: '48.50',
    });
  });

  it('soma os gastos sem erro de ponto flutuante', () => {
    expect(report().expenses).toEqual({ count: 2, total: '120.10' });
  });

  it('dia sem movimento: zeros e só a diária do motoboy', () => {
    const empty = report({ orders: [], expenseAmounts: [] });
    expect(empty.orders).toEqual({ count: 0, total: '0.00' });
    expect(empty.byPaymentMethod).toEqual([]);
    expect(empty.motoboy.totalCost).toBe('40.00');
  });
});

describe('buildClosingReport com pedidos importados (sem tipo, pagamento e taxa)', () => {
  const IMPORTED: ReportOrderRow = {
    amount: '36.40',
    type: null,
    paymentMethodId: null,
    deliveryFee: null,
  };

  it('conta o pedido no total e em "sem forma de pagamento"', () => {
    const result = buildClosingReport({
      closing: CLOSING,
      orders: [...ORDERS, IMPORTED],
      expenseAmounts: [],
      paymentMethods: METHODS,
    });
    expect(result.orders).toEqual({ count: 4, total: '131.70' });
    expect(result.withoutPaymentMethod).toEqual({ count: 1, total: '36.40' });
  });

  it('não soma taxa nem conta entrega para pedido sem tipo', () => {
    const result = buildClosingReport({
      closing: CLOSING,
      orders: [IMPORTED],
      expenseAmounts: [],
      paymentMethods: METHODS,
    });
    expect(result.delivery).toEqual({ count: 0, feesTotal: '0.00' });
    expect(result.motoboy.deliveryFees).toBe('0.00');
    expect(result.byPaymentMethod).toEqual([]);
  });
});
