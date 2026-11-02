import { formatCents } from '../common/money.js';
import type { PaymentMode } from '../orders/order-input.js';
import { remainingCents } from '../orders/order-fiado.js';
import { sumCents } from './payment-totals.js';
import type {
  ReportFiadoPaymentRow,
  ReportFiadoReceiptRow,
  ReportFiadoSoldRow,
  ReportPaymentMethodRow,
} from './report-source.js';

/** O recebido de fiado da noite (2026-10-25); soma no faturamento desde 2026-11-01. */
export interface FiadoReceived {
  count: number;
  /** O que abateu dos pedidos fiado. */
  total: string;
  /** Adicional (juros) cobrado na hora de receber. */
  extra: string;
  /** O que entrou: `total` mais `extra`. */
  received: string;
}

/** Quem pagou o quê na noite (2026-11-01). */
export interface FiadoReceiptLine {
  orderDayNumber: number;
  /** A noite do pedido pago. */
  orderBusinessDate: string;
  customerName: string | null;
  amount: string;
  extra: string;
  paymentMethodName: string;
  paymentMode: PaymentMode | null;
}

/** Um fiado vendido na noite e a situação dele hoje (2026-11-01). */
export interface FiadoSoldLine {
  dayNumber: number;
  customerName: string | null;
  amount: string;
  paidTotal: string;
  remaining: string;
  /** Última noite com pagamento; null sem nenhum. */
  lastPaidOn: string | null;
}

/** Os fiados vendidos na noite: fora do faturamento dela. */
export interface FiadoSold {
  count: number;
  total: string;
  orders: FiadoSoldLine[];
}

/** O detalhe do fiado no relatório do dia: o período só usa os totais. */
export interface FiadoNight {
  fiadoReceipts: FiadoReceiptLine[];
  fiadoSold: FiadoSold;
}

/**
 * Os totais do recebido de fiado da noite. O "Entrou no caixa" (quadro Gaveta) saiu a pedido do
 * usuário em 2026-10-27; as formas somam o recebido desde 2026-11-01 (`report/revenue.ts`).
 *
 * @example fiadoReceivedSummary(payments).received // '30.00'
 */
export function fiadoReceivedSummary(
  payments: ReportFiadoPaymentRow[],
): FiadoReceived {
  const totalCents = sumCents(payments.map((p) => p.amount));
  const extraCents = sumCents(payments.map((p) => p.extra));
  return {
    count: payments.length,
    total: formatCents(totalCents),
    extra: formatCents(extraCents),
    received: formatCents(totalCents + extraCents),
  };
}

function receiptLine(
  receipt: ReportFiadoReceiptRow,
  methods: ReportPaymentMethodRow[],
): FiadoReceiptLine {
  const method = methods.find((m) => m.id === receipt.paymentMethodId);
  return {
    orderDayNumber: receipt.orderDayNumber,
    orderBusinessDate: receipt.orderBusinessDate,
    customerName: receipt.customerName,
    amount: receipt.amount,
    extra: receipt.extra,
    paymentMethodName: method?.name ?? `Forma ${receipt.paymentMethodId}`,
    paymentMode: receipt.paymentMode,
  };
}

function soldLine(row: ReportFiadoSoldRow): FiadoSoldLine {
  const remaining = remainingCents({ ...row, canceled: false });
  return {
    dayNumber: row.dayNumber,
    customerName: row.customerName,
    amount: row.amount,
    paidTotal: row.paid,
    remaining: formatCents(remaining),
    lastPaidOn: row.lastPaidOn,
  };
}

/**
 * O detalhe do fiado na noite: quem pagou e os fiados vendidos, com a situação de hoje.
 *
 * @example fiadoNight(receipts, sold, methods).fiadoSold.orders[0].remaining // '133.90'
 */
export function fiadoNight(
  receipts: ReportFiadoReceiptRow[],
  sold: ReportFiadoSoldRow[],
  methods: ReportPaymentMethodRow[],
): FiadoNight {
  return {
    fiadoReceipts: receipts.map((r) => receiptLine(r, methods)),
    fiadoSold: {
      count: sold.length,
      total: formatCents(sumCents(sold.map((s) => s.amount))),
      orders: sold.map(soldLine),
    },
  };
}
