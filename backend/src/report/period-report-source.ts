import type { ReportOrderRow } from './report-source.js';

export const PERIOD_REPORT_SOURCE = Symbol('PERIOD_REPORT_SOURCE');

export interface ClosingOrderRow extends ReportOrderRow {
  closingId: number;
}

export interface ClosingExpenseRow {
  closingId: number;
  amount: string;
}

/** Leituras em lote (uma consulta para todos os dias do período); implementado sobre o Prisma. */
export interface PeriodReportSource {
  listOrders(closingIds: number[]): Promise<ClosingOrderRow[]>;
  listExpenses(closingIds: number[]): Promise<ClosingExpenseRow[]>;
}
