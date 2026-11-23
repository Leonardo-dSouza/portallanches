import { seesCosts } from '../auth/cost-visibility.js';
import type { SessionUser } from '../auth/session-user.js';
import type { ConsumptionTotals } from '../staff-consumption/consumption-cost.js';
import type { ClosingReport, PaymentMethodTotal } from './report-builder.js';

/**
 * Relatório do dia como sai pela API:
 * - O caixa não vê custos do consumo interno (só a quantidade).
 * - O caixa com a noite aberta não vê totais de vendas (contagem cega): revenue, ordersWithoutFiado,
 *   byPaymentMethod, withoutPaymentMethod, splitOrdersCount e drawer.check (2026-11-12), nem o
 *   total de `orders` (só a contagem, desde 2026-11-15: S-16).
 * - O caixa vê do iFood (2026-11-23) só quantos pedidos: comissão e líquido são margem do canal (S-09).
 * - Fechado ou login admin vê tudo.
 */
export type ClosingReportView = Omit<
  ClosingReport,
  | 'orders'
  | 'staffConsumption'
  | 'revenue'
  | 'ordersWithoutFiado'
  | 'byPaymentMethod'
  | 'withoutPaymentMethod'
  | 'splitOrdersCount'
  | 'ifood'
> & {
  orders: ClosingReport['orders'] | Pick<ClosingReport['orders'], 'count'>;
  staffConsumption?: ConsumptionTotals | Pick<ConsumptionTotals, 'count'>;
  revenue?: string;
  ordersWithoutFiado?: { count: number; total: string };
  byPaymentMethod?: PaymentMethodTotal[];
  withoutPaymentMethod?: { count: number; total: string };
  splitOrdersCount?: number;
  ifood: ClosingReport['ifood'] | Pick<ClosingReport['ifood'], 'count'>;
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
  const ifood = { count: report.ifood.count };
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
      orders: { count: report.orders.count },
      drawer: { ...report.drawer, check: null },
      ifood,
      ...(staffConsumption && { staffConsumption }),
    };
  }
  return {
    ...report,
    ifood,
    ...(staffConsumption && { staffConsumption }),
  };
}
