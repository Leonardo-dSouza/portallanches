import { formatCents } from '../common/money.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import {
  buildClosingReport,
  deliverySummary,
  ordersSummary,
  sumCents,
  sumDeliveryFeesCents,
  withoutPaymentMethodSummary,
  type ClosingReport,
} from './report-builder.js';
import type {
  ClosingExpenseRow,
  ClosingFiadoPaymentRow,
  ClosingOrderRow,
} from './period-report-source.js';
import type { ReportPaymentMethodRow } from './report-source.js';
import {
  cashByPaymentMethod,
  countSplitOrders,
  revenueCents,
} from './revenue.js';

export interface PeriodTotals {
  orders: ClosingReport['orders'];
  revenue: ClosingReport['revenue'];
  byPaymentMethod: ClosingReport['byPaymentMethod'];
  withoutPaymentMethod: ClosingReport['withoutPaymentMethod'];
  delivery: ClosingReport['delivery'];
  /** `dailyRates` = soma das diárias dos dias com fechamento no período. */
  motoboy: { dailyRates: string; deliveryFees: string; totalCost: string };
  expenses: ClosingReport['expenses'];
}

export interface PeriodReport {
  from: string;
  to: string;
  /** Um relatório por dia com fechamento, em ordem crescente de data. */
  days: ClosingReport[];
  totals: PeriodTotals;
  /** Pedidos divididos pagos na hora e não cancelados no recorte (card 2, 2026-11-08). */
  splitOrdersCount: number;
}

export interface PeriodInput {
  from: string;
  to: string;
  closings: ClosingRecord[];
  orders: ClosingOrderRow[];
  expenses: ClosingExpenseRow[];
  fiadoPayments: ClosingFiadoPaymentRow[];
  paymentMethods: ReportPaymentMethodRow[];
  /** Checa se o dia é a noite em andamento (hoje ou de madrugada antes das 6h). */
  isLiveNight?: (businessDate: string) => boolean;
}

function groupByClosing<T extends { closingId: number }>(
  rows: T[],
): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  for (const row of rows) {
    groups.set(row.closingId, [...(groups.get(row.closingId) ?? []), row]);
  }
  return groups;
}

function periodTotals(input: PeriodInput, days: ClosingReport[]): PeriodTotals {
  const { orders, expenses, fiadoPayments, paymentMethods } = input;
  const feesCents = sumDeliveryFeesCents(orders);
  // Noite sem expediente não soma diária do motoboy; o relatório do dia já traz a diária zerada.
  const dailyCents = sumCents(days.map((d) => d.motoboy.dailyRate));
  const expenseAmounts = expenses.map((e) => e.amount);
  return {
    orders: ordersSummary(orders),
    revenue: formatCents(revenueCents(orders, fiadoPayments, paymentMethods)),
    byPaymentMethod: cashByPaymentMethod(orders, fiadoPayments, paymentMethods),
    withoutPaymentMethod: withoutPaymentMethodSummary(orders),
    delivery: deliverySummary(orders, feesCents),
    motoboy: {
      dailyRates: formatCents(dailyCents),
      deliveryFees: formatCents(feesCents),
      totalCost: formatCents(dailyCents + feesCents),
    },
    expenses: {
      count: expenseAmounts.length,
      total: formatCents(sumCents(expenseAmounts)),
    },
  };
}

/**
 * Soma os fechamentos de um intervalo (função pura, centavos inteiros).
 * Dias sem fechamento não aparecem em `days` nem entram nos totais.
 *
 * @example buildPeriodReport({ from: '2026-09-01', to: '2026-09-30', closings, orders, expenses, paymentMethods })
 */
export function buildPeriodReport(input: PeriodInput): PeriodReport {
  const ordersByClosing = groupByClosing(input.orders);
  const expensesByClosing = groupByClosing(input.expenses);
  const fiadoByClosing = groupByClosing(input.fiadoPayments);
  const days = input.closings.map((closing) =>
    buildClosingReport({
      closing,
      orders: ordersByClosing.get(closing.id) ?? [],
      expenseAmounts: (expensesByClosing.get(closing.id) ?? []).map(
        (e) => e.amount,
      ),
      paymentMethods: input.paymentMethods,
      fiadoPayments: fiadoByClosing.get(closing.id) ?? [],
      isLive:
        closing.status === 'OPEN' &&
        Boolean(input.isLiveNight?.(closing.businessDate)),
    }),
  );
  return {
    from: input.from,
    to: input.to,
    days,
    totals: periodTotals(input, days),
    splitOrdersCount: countSplitOrders(input.orders, input.paymentMethods),
  };
}
