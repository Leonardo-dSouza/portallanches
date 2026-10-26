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
  { id: 1, name: 'PIX', sortOrder: 0, isCardTerminal: false, isFiado: false },
  {
    id: 2,
    name: 'Dinheiro',
    sortOrder: 1,
    isCardTerminal: false,
    isFiado: false,
  },
  {
    id: 3,
    name: 'Maquininha Ton',
    sortOrder: 2,
    isCardTerminal: true,
    isFiado: false,
  },
  { id: 4, name: 'Fiado', sortOrder: 3, isCardTerminal: false, isFiado: true },
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
  it('consumo interno vem à parte pelo custo, fora dos gastos e do faturamento (2026-10-23)', () => {
    const result = report({
      staffConsumptionCosts: [
        { cmvTotal: '15.57', missingCostCount: 0 },
        { cmvTotal: '6.15', missingCostCount: 1 },
      ],
    });

    expect(result.staffConsumption).toEqual({
      count: 2,
      cmvTotal: '21.72',
      missingCostCount: 1,
    });
    expect(result.expenses).toEqual({ count: 2, total: '120.10' });
    expect(result.orders.total).toBe('95.30');
  });

  it('sem os custos do consumo (noites do período) não traz o bloco', () => {
    expect(report().staffConsumption).toBeUndefined();
  });

  it('cancelados ficam fora de todas as somas e vêm contados à parte (2026-10-15)', () => {
    const result = report({
      orders: [
        ...ORDERS,
        order('99.00', 1, {
          type: 'DELIVERY',
          deliveryFee: '7.00',
          canceled: true,
        }),
      ],
    });
    expect(result.orders).toEqual({ count: 3, total: '95.30' });
    expect(result.byPaymentMethod[0]).toMatchObject({
      name: 'PIX',
      ordersCount: 2,
    });
    expect(result.delivery).toEqual({ count: 2, feesTotal: '8.50' });
    expect(result.canceled).toEqual({ count: 1, total: '99.00' });
  });

  it('fiado da noite: conta nas vendas, vem marcado e fica fora do Entrou no caixa (2026-10-25)', () => {
    const result = report({
      orders: [...ORDERS, order('40.00', 4)],
      fiadoPayments: [],
    });
    expect(result.orders.total).toBe('135.30');
    expect(result.byPaymentMethod.at(-1)).toMatchObject({
      name: 'Fiado',
      total: '40.00',
      isFiado: true,
    });
    expect(result.cashIn).toBe('95.30');
  });

  it('recebido de fiado na noite: por forma, com o adicional à parte, e soma no Entrou no caixa', () => {
    const result = report({
      fiadoPayments: [
        {
          amount: '20.00',
          extra: '5.00',
          paymentMethodId: 1,
          paymentMode: null,
        },
        {
          amount: '10.00',
          extra: '0.00',
          paymentMethodId: 2,
          paymentMode: null,
        },
        {
          amount: '4.00',
          extra: '1.00',
          paymentMethodId: 3,
          paymentMode: 'PIX',
        },
      ],
    });
    expect(result.fiadoReceived).toEqual({
      count: 3,
      total: '34.00',
      extra: '6.00',
      byPaymentMethod: [
        expect.objectContaining({
          name: 'PIX',
          ordersCount: 1,
          total: '20.00',
        }),
        expect.objectContaining({ name: 'Dinheiro', total: '10.00' }),
        expect.objectContaining({
          name: 'Maquininha Ton',
          total: '4.00',
          byMode: [{ mode: 'PIX', ordersCount: 1, total: '4.00' }],
        }),
      ],
    });
    // Não conta de novo como venda: o pedido entrou no faturamento da noite em que foi vendido.
    expect(result.orders.total).toBe('95.30');
    expect(result.cashIn).toBe('135.30');
  });

  it('sem os recebimentos (noites do período) não traz o recebido nem o Entrou no caixa', () => {
    const result = report();
    expect(result.fiadoReceived).toBeUndefined();
    expect(result.cashIn).toBeUndefined();
  });

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
        isFiado: false,
      },
      {
        paymentMethodId: 2,
        name: 'Dinheiro',
        ordersCount: 1,
        total: '20.00',
        byMode: [],
        isFiado: false,
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
        isFiado: false,
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
