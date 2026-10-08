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
  { id: 1, name: 'PIX', sortOrder: 0, isCardTerminal: false },
  { id: 2, name: 'Dinheiro', sortOrder: 1, isCardTerminal: false },
  { id: 3, name: 'Maquininha Ton', sortOrder: 2, isCardTerminal: true },
];
const order = (
  amount: string,
  paymentMethodId: number | null,
  fields: Partial<ReportOrderRow> = {},
): ReportOrderRow => ({
  amount,
  type: 'COUNTER',
  paymentMethodId,
  paymentMode: null,
  deliveryFee: '0.00',
  ...fields,
});
const ORDERS: ReportOrderRow[] = [
  order('30.10', 1),
  order('45.20', 1, { type: 'DELIVERY', deliveryFee: '3.00' }),
  order('20.00', 2, { type: 'DELIVERY', deliveryFee: '5.50' }),
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
      {
        paymentMethodId: 1,
        name: 'PIX',
        ordersCount: 2,
        total: '75.30',
        byMode: [],
      },
      {
        paymentMethodId: 2,
        name: 'Dinheiro',
        ordersCount: 1,
        total: '20.00',
        byMode: [],
      },
    ]);
  });

  it('maquininha vem com o subtotal de cada meio, na ordem crédito, débito, PIX', () => {
    const orders = [
      order('10.00', 3, { paymentMode: 'PIX' }),
      order('5.00', 3, { paymentMode: 'CREDIT' }),
      order('2.50', 3, { paymentMode: 'CREDIT' }),
    ];
    expect(report({ orders }).byPaymentMethod).toEqual([
      {
        paymentMethodId: 3,
        name: 'Maquininha Ton',
        ordersCount: 3,
        total: '17.50',
        byMode: [
          { mode: 'CREDIT', ordersCount: 2, total: '7.50' },
          { mode: 'PIX', ordersCount: 1, total: '10.00' },
        ],
      },
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
    paymentMode: null,
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
