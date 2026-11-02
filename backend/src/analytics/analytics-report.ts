import type { ClosingFiadoPaymentRow } from '../report/period-report-source.js';
import type { PaymentMethodTotal } from '../report/report-builder.js';
import { withoutPaymentMethodSummary } from '../report/report-builder.js';
import type {
  ReportOrderRow,
  ReportPaymentMethodRow,
} from '../report/report-source.js';
import { cashByPaymentMethod } from '../report/revenue.js';
import type {
  AnalyticsFiadoBalanceRow,
  AnalyticsOrderRow,
  AnalyticsStaffConsumptionRow,
  CategoryOrderRow,
} from './analytics-source.js';
import {
  dailySales,
  weekdaySales,
  type DaySales,
  type WeekdaySales,
} from './calendar-breakdown.js';
import {
  topCustomers,
  topNeighborhoods,
  type CustomerSales,
  type NeighborhoodSales,
} from './delivery-ranking.js';
import {
  itemsSummary,
  salesByCategory,
  topProducts,
  type CategorySales,
  type ProductSales,
} from './product-ranking.js';
import {
  fiadoToReceive,
  salesChanges,
  salesTotals,
  type FiadoToReceive,
  type SalesChanges,
  type SalesTotals,
} from './sales-summary.js';
import {
  staffConsumptionSummary,
  type StaffConsumptionSummary,
} from './staff-consumption-summary.js';

// Top 10: os rankings cabem na tela sem paginação (decisão do usuário para as listas).
const RANKING_LIMIT = 10;

export interface AnalyticsInput {
  from: string;
  to: string;
  /** Último dia contado: `to`, ou hoje se o período ainda está em andamento. */
  elapsedTo: string;
  previous: { from: string; to: string };
  closings: { id: number; businessDate: string }[];
  orders: AnalyticsOrderRow[];
  /** Só os totais do período anterior (para a comparação). */
  previousOrders: ReportOrderRow[];
  categoryOrder: CategoryOrderRow[];
  paymentMethods: ReportPaymentMethodRow[];
  staffConsumptions: AnalyticsStaffConsumptionRow[];
  /** Recebimentos de fiado do período (2026-11-01): entram no faturamento dele. */
  fiadoPayments: ClosingFiadoPaymentRow[];
  previousFiadoPayments: ClosingFiadoPaymentRow[];
  fiadoBalances: AnalyticsFiadoBalanceRow[];
}

export interface AnalyticsReport {
  from: string;
  to: string;
  elapsedTo: string;
  totals: SalesTotals;
  previous: { from: string; to: string; totals: SalesTotals };
  changes: SalesChanges;
  items: ReturnType<typeof itemsSummary>;
  topProducts: ProductSales[];
  byCategory: CategorySales[];
  topNeighborhoods: NeighborhoodSales[];
  topCustomers: CustomerSales[];
  daily: DaySales[];
  byWeekday: WeekdaySales[];
  byPaymentMethod: PaymentMethodTotal[];
  withoutPaymentMethod: { count: number; total: string };
  /** O que falta dos fiados vendidos no período (2026-11-01), fora do faturamento. */
  fiadoToReceive: FiadoToReceive;
  /** Consumo interno do período (2026-10-23), à parte das vendas. */
  staffConsumption: StaffConsumptionSummary;
}

type Rankings = Pick<
  AnalyticsReport,
  'topProducts' | 'byCategory' | 'topNeighborhoods' | 'topCustomers'
>;

function rankingsOf({ orders, categoryOrder }: AnalyticsInput): Rankings {
  return {
    topProducts: topProducts(orders, RANKING_LIMIT),
    byCategory: salesByCategory(orders, categoryOrder),
    topNeighborhoods: topNeighborhoods(orders, RANKING_LIMIT),
    topCustomers: topCustomers(orders, RANKING_LIMIT),
  };
}

/**
 * Análise do período para o gerente (função pura, somas em centavos): números de cabeça
 * comparados com o período anterior, rankings, dias e pagamentos. O dinheiro segue o
 * recebimento; pedidos, rankings e entregas ficam na noite da venda (2026-11-01).
 *
 * @example buildAnalyticsReport({ from, to, elapsedTo, previous, closings, orders, previousOrders, categoryOrder, paymentMethods, fiadoPayments, previousFiadoPayments, fiadoBalances })
 */
export function buildAnalyticsReport(input: AnalyticsInput): AnalyticsReport {
  const methods = input.paymentMethods;
  const payments = input.fiadoPayments;
  const totals = salesTotals(input.orders, { payments, methods });
  const previousTotals = salesTotals(input.previousOrders, {
    payments: input.previousFiadoPayments,
    methods,
  });
  const daily = dailySales(input.closings, input.orders, { payments, methods });
  return {
    from: input.from,
    to: input.to,
    elapsedTo: input.elapsedTo,
    totals,
    previous: { ...input.previous, totals: previousTotals },
    changes: salesChanges(totals, previousTotals),
    items: itemsSummary(input.orders),
    ...rankingsOf(input),
    daily,
    byWeekday: weekdaySales(daily),
    byPaymentMethod: cashByPaymentMethod(input.orders, payments, methods),
    withoutPaymentMethod: withoutPaymentMethodSummary(input.orders),
    fiadoToReceive: fiadoToReceive(input.fiadoBalances),
    staffConsumption: staffConsumptionSummary(
      input.staffConsumptions,
      RANKING_LIMIT,
    ),
  };
}
