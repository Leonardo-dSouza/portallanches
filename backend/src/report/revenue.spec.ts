import type {
  ReportFiadoPaymentRow,
  ReportOrderRow,
  ReportPaymentMethodRow,
} from './report-source.js';
import {
  cashByPaymentMethod,
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
  it('tira o fiado e mantém o pedido sem forma (A pagar, importado)', () => {
    const orders = [order('11.00', 1), order('183.90', 9), order('5.00', null)];
    expect(paidOnTheSpot(orders, METHODS).map((o) => o.amount)).toEqual([
      '11.00',
      '5.00',
    ]);
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
});
