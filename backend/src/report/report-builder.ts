import { formatCents, toCents } from '../common/money.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import {
  sumConsumptionCosts,
  type ConsumptionCost,
  type ConsumptionTotals,
} from '../staff-consumption/consumption-cost.js';
import { fiadoReceivedSummary, type FiadoReceived } from './fiado-report.js';
import {
  sumCents,
  totalsByPaymentMethod,
  type PaymentMethodTotal,
} from './payment-totals.js';
import type {
  ReportFiadoPaymentRow,
  ReportOrderRow,
  ReportPaymentMethodRow,
} from './report-source.js';

// Somas por forma de pagamento: em `payment-totals.ts` (o fiado usa as mesmas, 2026-10-25).
export {
  sumCents,
  totalsByPaymentMethod,
  type PaymentMethodTotal,
  type PaymentModeTotal,
} from './payment-totals.js';

export interface ClosingReport {
  businessDate: string;
  status: 'OPEN' | 'CLOSED';
  orders: { count: number; total: string };
  /**
   * Os pedidos sem os fiados (2026-10-27): o "Pedidos" do quadro Vendas, com o fiado da noite
   * numa linha própria logo abaixo (a forma `isFiado` de `byPaymentMethod`).
   */
  ordersWithoutFiado: { count: number; total: string };
  byPaymentMethod: PaymentMethodTotal[];
  /** Pedidos sem forma de pagamento (importados da planilha histórica): fecham a soma com `orders`. */
  withoutPaymentMethod: { count: number; total: string };
  delivery: { count: number; feesTotal: string };
  /** Custo do motoboy = diária do dia + soma das taxas de entrega. */
  motoboy: { dailyRate: string; deliveryFees: string; totalCost: string };
  expenses: { count: number; total: string };
  /** Cancelados do dia (2026-10-15): fora de todas as somas acima, com o motivo de cada um. */
  canceled: { count: number; total: string; orders: CanceledOrderLine[] };
  /**
   * Consumo interno (2026-10-23): pelo custo, à parte (não saiu dinheiro da gaveta). Só no
   * relatório do dia; o período tem o bloco próprio na Análise.
   */
  staffConsumption?: ConsumptionTotals;
  /**
   * Recebido de fiado na noite (2026-10-25): por forma e o adicional, fora das vendas (a venda
   * contou na noite em que foi vendida). Só no relatório do dia.
   */
  fiadoReceived?: FiadoReceived;
}

/** Um cancelado no quadro Vendas (2026-10-27): "#12 Pedido duplicado", fora do total. */
export interface CanceledOrderLine {
  dayNumber: number;
  amount: string;
  reason: string | null;
}

export interface ReportInput {
  closing: ClosingRecord;
  orders: ReportOrderRow[];
  expenseAmounts: string[];
  paymentMethods: ReportPaymentMethodRow[];
  /** Custo de cada consumo interno do dia; ausente nas noites do relatório de período. */
  staffConsumptionCosts?: ConsumptionCost[];
  /** Recebimentos de fiado da noite; ausente nas noites do relatório de período. */
  fiadoPayments?: ReportFiadoPaymentRow[];
}

/** Taxas de entrega em centavos; pedido sem taxa informada (importado) conta como 0. */
export function sumDeliveryFeesCents(orders: ReportOrderRow[]): number {
  return sumCents(
    orders.flatMap((o) => (o.deliveryFee ? [o.deliveryFee] : [])),
  );
}

export function withoutPaymentMethodSummary(
  orders: ReportOrderRow[],
): ClosingReport['withoutPaymentMethod'] {
  const own = orders.filter((o) => o.paymentMethodId === null);
  return {
    count: own.length,
    total: formatCents(sumCents(own.map((o) => o.amount))),
  };
}

function motoboySummary(
  closing: ClosingRecord,
  feesCents: number,
): ClosingReport['motoboy'] {
  return {
    dailyRate: closing.motoboyDailyRate,
    deliveryFees: formatCents(feesCents),
    totalCost: formatCents(toCents(closing.motoboyDailyRate) + feesCents),
  };
}

export function ordersSummary(
  orders: ReportOrderRow[],
): ClosingReport['orders'] {
  return {
    count: orders.length,
    total: formatCents(sumCents(orders.map((o) => o.amount))),
  };
}

/** Os cancelados à parte, na ordem do número do dia. */
function canceledSummary(orders: ReportOrderRow[]): ClosingReport['canceled'] {
  const lines = orders.flatMap((o) =>
    o.canceled
      ? [
          {
            dayNumber: o.canceled.dayNumber,
            amount: o.amount,
            reason: o.canceled.reason,
          },
        ]
      : [],
  );
  return {
    ...ordersSummary(orders.filter((o) => o.canceled)),
    orders: lines.sort((a, b) => a.dayNumber - b.dayNumber),
  };
}

/** Os pedidos fora da forma fiado; o sem forma (A pagar, importado) fica. */
function withoutFiadoSummary(
  orders: ReportOrderRow[],
  methods: ReportPaymentMethodRow[],
): ClosingReport['ordersWithoutFiado'] {
  const fiadoIds = new Set(methods.filter((m) => m.isFiado).map((m) => m.id));
  return ordersSummary(
    orders.filter(
      (o) => o.paymentMethodId === null || !fiadoIds.has(o.paymentMethodId),
    ),
  );
}

export function deliverySummary(
  orders: ReportOrderRow[],
  feesCents: number,
): ClosingReport['delivery'] {
  return {
    count: orders.filter((o) => o.type === 'DELIVERY').length,
    feesTotal: formatCents(feesCents),
  };
}

/**
 * Monta o relatório de fechamento a partir dos dados do dia (função pura).
 * Somas em centavos inteiros; formas de pagamento sem pedidos ficam de fora.
 *
 * @example buildClosingReport({ closing, orders, expenseAmounts: ['120.00'], paymentMethods })
 */
export function buildClosingReport(input: ReportInput): ClosingReport {
  const { closing, expenseAmounts, paymentMethods } = input;
  const orders = input.orders.filter((o) => !o.canceled);
  const feesCents = sumDeliveryFeesCents(orders);
  return {
    businessDate: closing.businessDate,
    status: closing.status,
    orders: ordersSummary(orders),
    ordersWithoutFiado: withoutFiadoSummary(orders, paymentMethods),
    byPaymentMethod: totalsByPaymentMethod(orders, paymentMethods),
    withoutPaymentMethod: withoutPaymentMethodSummary(orders),
    delivery: deliverySummary(orders, feesCents),
    motoboy: motoboySummary(closing, feesCents),
    expenses: {
      count: expenseAmounts.length,
      total: formatCents(sumCents(expenseAmounts)),
    },
    canceled: canceledSummary(input.orders),
    ...(input.staffConsumptionCosts && {
      staffConsumption: sumConsumptionCosts(input.staffConsumptionCosts),
    }),
    ...(input.fiadoPayments && {
      fiadoReceived: fiadoReceivedSummary(input.fiadoPayments, paymentMethods),
    }),
  };
}
