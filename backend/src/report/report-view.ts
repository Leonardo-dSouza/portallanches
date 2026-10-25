import { seesCosts } from '../auth/cost-visibility.js';
import type { SessionUser } from '../auth/session-user.js';
import type { ConsumptionTotals } from '../staff-consumption/consumption-cost.js';
import type { ClosingReport } from './report-builder.js';

/** Relatório do dia como sai pela API: o caixa recebe do consumo interno só a quantidade. */
export interface ClosingReportView extends Omit<
  ClosingReport,
  'staffConsumption'
> {
  staffConsumption?: ConsumptionTotals | Pick<ConsumptionTotals, 'count'>;
}

/**
 * O relatório inteiro para o admin; para o caixa, o consumo interno sem o custo (2026-10-25: o
 * custo do lanche não sai pela API para o caixa).
 *
 * @example reportFor(caixa, report).staffConsumption // { count: 2 }
 */
export function reportFor(
  user: SessionUser,
  report: ClosingReport,
): ClosingReportView {
  const staff = report.staffConsumption;
  if (seesCosts(user) || !staff) return report;
  return { ...report, staffConsumption: { count: staff.count } };
}
