import {
  sumCents,
  totalsByPaymentMethod,
  type PaidAmountRow,
  type PaymentMethodTotal,
} from './payment-totals.js';
import { formatCents, toCents } from '../common/money.js';
import { isSplitPayment } from '../orders/payment-parts.js';
import type {
  ReportFiadoPaymentRow,
  ReportOrderRow,
  ReportPaymentMethodRow,
} from './report-source.js';

// Faturamento por recebimento (decisão do usuário, 2026-11-01): a venda fiada só baixa o estoque
// na noite do pedido; o dinheiro entra no faturamento da noite em que foi pago, com o adicional.

/**
 * Conta aberta (A pagar, card 8): balcão ainda sem forma. O importado da planilha também não tem
 * forma, mas não tem tipo, e esse conta como pago.
 *
 * @example isOpenAccount({ type: 'COUNTER', paymentMethodId: null }) // true
 */
export function isOpenAccount(
  order: Pick<ReportOrderRow, 'paymentMethodId' | 'type'>,
): boolean {
  return order.type !== null && order.paymentMethodId === null;
}

/**
 * Os pedidos pagos na hora: fora a forma fiado e, desde 2026-11-08 (card 8), fora o A pagar,
 * que só entra no faturamento quando recebe. O importado (sem tipo e sem forma) fica.
 *
 * @example paidOnTheSpot([pix, fiado, aPagar, importado], methods) // [pix, importado]
 */
export function paidOnTheSpot<
  T extends Pick<ReportOrderRow, 'paymentMethodId' | 'type'>,
>(orders: T[], methods: ReportPaymentMethodRow[]): T[] {
  const fiadoIds = new Set(methods.filter((m) => m.isFiado).map((m) => m.id));
  return orders.filter(
    (o) =>
      !isOpenAccount(o) &&
      (o.paymentMethodId === null || !fiadoIds.has(o.paymentMethodId)),
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

/** O que o faturamento lê além dos pedidos: os recebimentos e as formas (para achar a fiado). */
export interface FiadoCash<
  P extends ReportFiadoPaymentRow = ReportFiadoPaymentRow,
> {
  payments: P[];
  methods: ReportPaymentMethodRow[];
}

/**
 * O dinheiro de cada pedido pago na hora por forma: o dividido entra como as suas partes (card 2,
 * 2026-11-08), cada uma um lançamento na sua forma, como os recebimentos de fiado.
 *
 * @example orderCashRows([pix20MaisDinheiro30]).length // 2
 */
export function orderCashRows(orders: ReportOrderRow[]): PaidAmountRow[] {
  return orders.flatMap<PaidAmountRow>((o) =>
    isSplitPayment(o) ? (o.paymentParts ?? []) : [o],
  );
}

/**
 * Quantos pedidos pagos na hora foram divididos: a nota "N pedidos divididos" do relatório do
 * dia, do período e da Análise (quem chama já tirou os cancelados).
 *
 * @example countSplitOrders([pix20MaisDinheiro30, pix], methods) // 1
 */
export function countSplitOrders<
  T extends Pick<ReportOrderRow, 'paymentMethodId' | 'type' | 'paymentParts'>,
>(orders: T[], methods: ReportPaymentMethodRow[]): number {
  return paidOnTheSpot(orders, methods).filter(isSplitPayment).length;
}

const cashRows = (
  orders: ReportOrderRow[],
  payments: ReportFiadoPaymentRow[],
  methods: ReportPaymentMethodRow[],
): PaidAmountRow[] => [
  ...orderCashRows(paidOnTheSpot(orders, methods)),
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
