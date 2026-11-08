import type {
  ReportFiadoPaymentRow,
  ReportOrderRow,
  ReportPaymentMethodRow,
} from './report-source.js';
import {
  cashByPaymentMethod,
  countSplitOrders,
  isOpenAccount,
  orderCashRows,
  paidOnTheSpot,
  receivedRows,
  revenueCents,
} from './revenue.js';

const METHODS: ReportPaymentMethodRow[] = [
  {
    id: 1,
    name: 'Dinheiro',
    sortOrder: 0,
    isCardTerminal: false,
    isFiado: false,
  },
  {
    id: 7,
    name: 'Cartão Ton',
    sortOrder: 2,
    isCardTerminal: true,
    isFiado: false,
  },
  { id: 9, name: 'Fiado', sortOrder: 16, isCardTerminal: false, isFiado: true },
];

const order = (
  amount: string,
  paymentMethodId: number | null,
  paymentMode: ReportOrderRow['paymentMode'] = null,
): ReportOrderRow => ({
  amount,
  type: 'COUNTER',
  paymentMethodId,
  paymentMode,
  deliveryFee: '0.00',
});

// O caso que trouxe a regra (2026-11-01): R$ 183,90 + R$ 10,00 de adicional no Ton débito.
const ALEMAO: ReportFiadoPaymentRow = {
  amount: '183.90',
  extra: '10.00',
  paymentMethodId: 7,
  paymentMode: 'DEBIT',
};

describe('paidOnTheSpot', () => {
  it('tira o fiado e o A pagar, e mantém o importado sem tipo nem forma', () => {
    const imported = { ...order('7.00', null), type: null };
    const orders = [
      order('11.00', 1),
      order('183.90', 9),
      order('5.00', null),
      imported,
    ];
    expect(paidOnTheSpot(orders, METHODS).map((o) => o.amount)).toEqual([
      '11.00',
      '7.00',
    ]);
  });
});

describe('isOpenAccount', () => {
  it('é A pagar só o pedido com tipo e sem forma', () => {
    expect(isOpenAccount(order('5.00', null))).toBe(true);
    expect(isOpenAccount(order('5.00', 1))).toBe(false);
    expect(isOpenAccount({ ...order('5.00', null), type: null })).toBe(false);
  });
});

describe('receivedRows', () => {
  it('o recebimento vale o que entrou: valor mais adicional, na forma dele', () => {
    expect(receivedRows([ALEMAO])).toEqual([
      { amount: '193.90', paymentMethodId: 7, paymentMode: 'DEBIT' },
    ]);
  });
});

describe('revenueCents', () => {
  it('o A pagar fica fora do faturamento da noite aberta (card 8)', () => {
    expect(
      revenueCents([order('11.00', 1), order('35.20', null)], [], METHODS),
    ).toBe(1100);
  });

  it('a venda fiada fica fora da noite do pedido', () => {
    const orders = [order('575.30', 1), order('183.90', 9)];
    expect(revenueCents(orders, [], METHODS)).toBe(57530);
  });

  it('o recebido soma com o adicional na noite do pagamento', () => {
    expect(revenueCents([order('321.30', 1)], [ALEMAO], METHODS)).toBe(51520);
  });
});

describe('cashByPaymentMethod', () => {
  const totals = cashByPaymentMethod(
    [order('11.00', 1), order('187.10', 7, 'DEBIT'), order('40.00', 9)],
    [ALEMAO],
    METHODS,
  );

  it('a forma soma as vendas e o recebido com adicional, e cada recebimento conta um', () => {
    expect(totals.find((t) => t.name === 'Cartão Ton')).toEqual({
      paymentMethodId: 7,
      name: 'Cartão Ton',
      ordersCount: 2,
      total: '381.00',
      byMode: [{ mode: 'DEBIT', ordersCount: 2, total: '381.00' }],
    });
  });

  it('a forma fiado nunca aparece', () => {
    expect(totals.map((t) => t.name)).toEqual(['Dinheiro', 'Cartão Ton']);
  });

  it('pedido dividido entra como suas partes por forma', () => {
    const splitOrder: ReportOrderRow = {
      ...order('50.00', 1),
      paymentParts: [
        { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
        { paymentMethodId: 7, paymentMode: 'DEBIT', amount: '30.00' },
      ],
    };
    const splitTotals = cashByPaymentMethod([splitOrder], [], METHODS);
    expect(splitTotals.find((t) => t.paymentMethodId === 1)).toEqual({
      paymentMethodId: 1,
      name: 'Dinheiro',
      ordersCount: 1,
      total: '20.00',
      byMode: [],
    });
    expect(splitTotals.find((t) => t.paymentMethodId === 7)).toEqual({
      paymentMethodId: 7,
      name: 'Cartão Ton',
      ordersCount: 1,
      total: '30.00',
      byMode: [{ mode: 'DEBIT', ordersCount: 1, total: '30.00' }],
    });
  });
});

describe('pedido dividido (card 2)', () => {
  const split: ReportOrderRow = {
    ...order('50.00', 1),
    paymentParts: [
      { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
      { paymentMethodId: 7, paymentMode: 'DEBIT', amount: '30.00' },
    ],
  };

  it('orderCashRows abre o dividido nas partes e deixa o de uma forma inteiro', () => {
    const rows = orderCashRows([split, order('12.00', 7, 'CREDIT')]);
    expect(rows.map((r) => [r.paymentMethodId, r.amount])).toEqual([
      [1, '20.00'],
      [7, '30.00'],
      [7, '12.00'],
    ]);
  });

  it('countSplitOrders conta só o dividido pago na hora', () => {
    const aPagar = order('20.00', null);
    expect(countSplitOrders([split, order('9.00', 1), aPagar], METHODS)).toBe(
      1,
    );
  });
});
