import type { PaymentMethodTotal } from '../report/report-builder.js';
import {
  totalsByPaymentMethod,
  withoutPaymentMethodSummary,
} from '../report/report-builder.js';
import type {
  ReportOrderRow,
  ReportPaymentMethodRow,
} from '../report/report-source.js';
import type {
  AnalyticsOrderRow,
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
  salesChanges,
  salesTotals,
  type SalesChanges,
  type SalesTotals,
} from './sales-summary.js';

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
 * comparados com o período anterior, rankings, dias e pagamentos.
 *
 * @example buildAnalyticsReport({ from, to, elapsedTo, previous, closings, orders, previousOrders, categoryOrder, paymentMethods })
 */
export function buildAnalyticsReport(input: AnalyticsInput): AnalyticsReport {
  const totals = salesTotals(input.orders);
  const previousTotals = salesTotals(input.previousOrders);
  const daily = dailySales(input.closings, input.orders);
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
    byPaymentMethod: totalsByPaymentMethod(input.orders, input.paymentMethods),
    withoutPaymentMethod: withoutPaymentMethodSummary(input.orders),
  };
}
