import type { ReportFiadoPaymentRow, ReportOrderRow } from './report-source.js';

export const PERIOD_REPORT_SOURCE = Symbol('PERIOD_REPORT_SOURCE');

export interface ClosingOrderRow extends ReportOrderRow {
  closingId: number;
}

export interface ClosingExpenseRow {
  closingId: number;
  amount: string;
}

/** Recebimento de fiado com a noite em que entrou (2026-11-01). */
export interface ClosingFiadoPaymentRow extends ReportFiadoPaymentRow {
  closingId: number;
}

/** Leituras em lote (uma consulta para todos os dias do período); implementado sobre o Prisma. */
export interface PeriodReportSource {
  listOrders(closingIds: number[]): Promise<ClosingOrderRow[]>;
  listExpenses(closingIds: number[]): Promise<ClosingExpenseRow[]>;
  /** Só os não estornados. */
  listFiadoPayments(closingIds: number[]): Promise<ClosingFiadoPaymentRow[]>;
}
