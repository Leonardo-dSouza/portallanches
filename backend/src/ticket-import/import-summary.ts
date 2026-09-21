import { formatCents, toCents } from '../common/money.js';
import type { PlannedDay } from './import-types.js';

export interface MonthSummary {
  month: string;
  days: number;
  orders: number;
  ordersTotal: string;
  motoboyTotal: string;
  otherExpensesTotal: string;
}

const sumOf = (values: string[]): number =>
  values.reduce((sum, value) => sum + toCents(value), 0);

function summarize(month: string, days: PlannedDay[]): MonthSummary {
  const motoboy = days.flatMap((d) => (d.motoboy ? [d.motoboy] : []));
  return {
    month,
    days: days.length,
    orders: days.reduce((sum, d) => sum + d.orderAmounts.length, 0),
    ordersTotal: formatCents(sumOf(days.flatMap((d) => d.orderAmounts))),
    motoboyTotal: formatCents(sumOf(motoboy)),
    otherExpensesTotal: formatCents(
      sumOf(days.flatMap((d) => d.otherExpenses)),
    ),
  };
}

/**
 * Totais por mês (`YYYY-MM`) para conferir contra a planilha antes de gravar.
 *
 * @example summarizeByMonth(days)[0] // { month: '2026-01', days: 20, orders: 340, ... }
 */
export function summarizeByMonth(days: PlannedDay[]): MonthSummary[] {
  const byMonth = new Map<string, PlannedDay[]>();
  for (const day of days) {
    const month = day.date.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), day]);
  }
  return [...byMonth].map(([month, own]) => summarize(month, own));
}
