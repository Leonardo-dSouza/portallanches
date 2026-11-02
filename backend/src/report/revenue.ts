import {
  sumCents,
  totalsByPaymentMethod,
  type PaidAmountRow,
  type PaymentMethodTotal,
} from './payment-totals.js';
import { formatCents, toCents } from '../common/money.js';
import type {
  ReportFiadoPaymentRow,
  ReportOrderRow,
  ReportPaymentMethodRow,
} from './report-source.js';

// Faturamento por recebimento (decisão do usuário, 2026-11-01): a venda fiada só baixa o estoque
// na noite do pedido; o dinheiro entra no faturamento da noite em que foi pago, com o adicional.

/**
 * Os pedidos pagos na hora: fora a forma fiado. O sem forma (A pagar, importado) fica.
 *
 * @example paidOnTheSpot([pix, fiado], methods) // [pix]
 */
export function paidOnTheSpot<
  T extends Pick<ReportOrderRow, 'paymentMethodId'>,
>(orders: T[], methods: ReportPaymentMethodRow[]): T[] {
  const fiadoIds = new Set(methods.filter((m) => m.isFiado).map((m) => m.id));
  return orders.filter(
    (o) => o.paymentMethodId === null || !fiadoIds.has(o.paymentMethodId),
  );
}

/**
 * Os recebimentos de fiado como dinheiro numa forma: o valor mais o adicional.
 *
 * @example receivedRows([{ amount: '20.00', extra: '5.00', … }])[0].amount // '25.00'
 */
export function receivedRows(
  payments: ReportFiadoPaymentRow[],
): PaidAmountRow[] {
  return payments.map(({ amount, extra, paymentMethodId, paymentMode }) => ({
    amount: formatCents(toCents(amount) + toCents(extra)),
    paymentMethodId,
    paymentMode,
  }));
}

const cashRows = (
  orders: ReportOrderRow[],
  payments: ReportFiadoPaymentRow[],
  methods: ReportPaymentMethodRow[],
): PaidAmountRow[] => [
  ...paidOnTheSpot(orders, methods),
  ...receivedRows(payments),
];

/**
 * O faturamento em centavos: os pedidos pagos na hora mais o recebido de fiado com o adicional.
 *
 * @example revenueCents(orders, payments, methods) // 51520
 */
export function revenueCents(
  orders: ReportOrderRow[],
  payments: ReportFiadoPaymentRow[],
  methods: ReportPaymentMethodRow[],
): number {
  return sumCents(cashRows(orders, payments, methods).map((r) => r.amount));
}

/**
 * Tudo que entrou em cada forma: bate com a maquininha. Cada recebimento conta como um
 * lançamento, e a forma fiado nunca aparece.
 *
 * @example cashByPaymentMethod(orders, payments, methods)[0].total // '381.00'
 */
export function cashByPaymentMethod(
  orders: ReportOrderRow[],
  payments: ReportFiadoPaymentRow[],
  methods: ReportPaymentMethodRow[],
): PaymentMethodTotal[] {
  return totalsByPaymentMethod(cashRows(orders, payments, methods), methods);
}
