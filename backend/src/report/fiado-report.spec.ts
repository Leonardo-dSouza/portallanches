import { fiadoNight, fiadoReceivedSummary } from './fiado-report.js';
import type {
  ReportFiadoReceiptRow,
  ReportFiadoSoldRow,
  ReportPaymentMethodRow,
} from './report-source.js';

const METHODS: ReportPaymentMethodRow[] = [
  {
    id: 7,
    name: 'Cartão Ton',
    sortOrder: 2,
    isCardTerminal: true,
    isFiado: false,
  },
];

const RECEIPT: ReportFiadoReceiptRow = {
  amount: '183.90',
  extra: '10.00',
  paymentMethodId: 7,
  paymentMode: 'DEBIT',
  orderDayNumber: 16,
  orderBusinessDate: '2026-10-25',
  customerName: 'Alemão',
};

const SOLD: ReportFiadoSoldRow = {
  dayNumber: 16,
  customerName: 'Alemão',
  amount: '183.90',
  paid: '0.00',
  lastPaidOn: null,
};

describe('fiadoReceivedSummary', () => {
  it('separa o que abateu do adicional e soma o que entrou', () => {
    expect(fiadoReceivedSummary([RECEIPT, RECEIPT])).toEqual({
      count: 2,
      total: '367.80',
      extra: '20.00',
      received: '387.80',
    });
  });
});

describe('fiadoNight', () => {
  it('cada recebimento leva o pedido, o cliente e o nome da forma', () => {
    const { fiadoReceipts } = fiadoNight([RECEIPT], [], METHODS);
    expect(fiadoReceipts).toEqual([
      {
        orderDayNumber: 16,
        orderBusinessDate: '2026-10-25',
        customerName: 'Alemão',
        amount: '183.90',
        extra: '10.00',
        paymentMethodName: 'Cartão Ton',
        paymentMode: 'DEBIT',
      },
    ]);
  });

  it('fiado vendido sem pagamento: falta tudo e sem noite de pagamento', () => {
    const { fiadoSold } = fiadoNight([], [SOLD], METHODS);
    expect(fiadoSold).toEqual({
      count: 1,
      total: '183.90',
      orders: [
        {
          dayNumber: 16,
          customerName: 'Alemão',
          amount: '183.90',
          paidTotal: '0.00',
          remaining: '183.90',
          lastPaidOn: null,
        },
      ],
    });
  });

  it('fiado pago em parte mostra o que falta e a última noite paga', () => {
    const paidPart = { ...SOLD, paid: '50.00', lastPaidOn: '2026-11-01' };
    const { fiadoSold } = fiadoNight([], [paidPart], METHODS);
    expect(fiadoSold.orders[0]).toMatchObject({
      paidTotal: '50.00',
      remaining: '133.90',
      lastPaidOn: '2026-11-01',
    });
  });
});
