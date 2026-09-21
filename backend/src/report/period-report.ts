import { formatCents } from '../common/money.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import {
  buildClosingReport,
  deliverySummary,
  ordersSummary,
  sumCents,
  sumDeliveryFeesCents,
  withoutPaymentMethodSummary,
  totalsByPaymentMethod,
  type ClosingReport,
} from './report-builder.js';
import type {
  ClosingExpenseRow,
  ClosingOrderRow,
} from './period-report-source.js';
import type { ReportPaymentMethodRow } from './report-source.js';

export interface PeriodTotals {
  orders: ClosingReport['orders'];
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
}

export interface PeriodInput {
  from: string;
  to: string;
  closings: ClosingRecord[];
  orders: ClosingOrderRow[];
  expenses: ClosingExpenseRow[];
  paymentMethods: ReportPaymentMethodRow[];
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

function periodTotals(input: PeriodInput): PeriodTotals {
  const { closings, orders, expenses, paymentMethods } = input;
  const feesCents = sumDeliveryFeesCents(orders);
  const dailyCents = sumCents(closings.map((c) => c.motoboyDailyRate));
  const expenseAmounts = expenses.map((e) => e.amount);
  return {
    orders: ordersSummary(orders),
    byPaymentMethod: totalsByPaymentMethod(orders, paymentMethods),
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
  const days = input.closings.map((closing) =>
    buildClosingReport({
      closing,
      orders: ordersByClosing.get(closing.id) ?? [],
      expenseAmounts: (expensesByClosing.get(closing.id) ?? []).map(
        (e) => e.amount,
      ),
      paymentMethods: input.paymentMethods,
    }),
  );
  return { from: input.from, to: input.to, days, totals: periodTotals(input) };
}
