import { seesCosts } from '../auth/cost-visibility.js';
import type { SessionUser } from '../auth/session-user.js';
import type { ConsumptionTotals } from '../staff-consumption/consumption-cost.js';
import type { ClosingReport, PaymentMethodTotal } from './report-builder.js';

/**
 * Relatório do dia como sai pela API:
 * - O caixa não vê custos do consumo interno (só a quantidade).
 * - O caixa com a noite aberta não vê totais de vendas (contagem cega): revenue, ordersWithoutFiado,
 *   byPaymentMethod, withoutPaymentMethod, splitOrdersCount e drawer.check (2026-11-12).
 * - Fechado ou login admin vê tudo.
 */
export type ClosingReportView = Omit<
  ClosingReport,
  | 'staffConsumption'
  | 'revenue'
  | 'ordersWithoutFiado'
  | 'byPaymentMethod'
  | 'withoutPaymentMethod'
  | 'splitOrdersCount'
> & {
  staffConsumption?: ConsumptionTotals | Pick<ConsumptionTotals, 'count'>;
  revenue?: string;
  ordersWithoutFiado?: { count: number; total: string };
  byPaymentMethod?: PaymentMethodTotal[];
  withoutPaymentMethod?: { count: number; total: string };
  splitOrdersCount?: number;
};

/**
 * O relatório inteiro para o admin; para o caixa, esconde custos e, com a noite aberta,
 * esconde os totais de vendas para garantir a contagem cega.
 *
 * @example reportFor(caixa, report).drawer.check // null quando OPEN
 */
export function reportFor(
  user: SessionUser,
  report: ClosingReport,
): ClosingReportView {
  if (seesCosts(user)) return report;
  const staff = report.staffConsumption;
  const staffConsumption = staff ? { count: staff.count } : undefined;
  if (report.status === 'OPEN') {
    const {
      revenue: _revenue,
      ordersWithoutFiado: _ordersWithoutFiado,
      byPaymentMethod: _byPaymentMethod,
      withoutPaymentMethod: _withoutPaymentMethod,
      splitOrdersCount: _splitOrdersCount,
      ...rest
    } = report;
    return {
      ...rest,
      drawer: { ...report.drawer, check: null },
      ...(staffConsumption && { staffConsumption }),
    };
  }
  return {
    ...report,
    ...(staffConsumption && { staffConsumption }),
  };
}
