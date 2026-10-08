import type { Money, PaymentMethodTotal } from './types';

/** Números de cabeça de um período (dinheiro como texto com 2 casas, igual à API). */
export interface SalesTotals {
  orders: number;
  revenue: Money;
  averageTicket: Money;
  counter: number;
  deliveries: number;
  deliveryFees: Money;
}

/** Variação % com 1 casa ('12.5', '-3.0'); null quando o período anterior é zero. */
export type PercentChange = string | null;

export interface SalesChanges {
  revenue: PercentChange;
  orders: PercentChange;
  averageTicket: PercentChange;
  deliveries: PercentChange;
}

export interface ProductSales {
  productId: number;
  name: string;
  categoryName: string;
  quantity: number;
  revenue: Money;
}

export interface CategorySales {
  categoryName: string;
  quantity: number;
  revenue: Money;
  /** Itens da categoria, do que mais saiu ao que menos. */
  products: ProductSales[];
}

export interface NeighborhoodSales {
  neighborhood: string;
  deliveries: number;
  revenue: Money;
}

export interface CustomerSales {
  customerId: number;
  name: string;
  orders: number;
  revenue: Money;
}

export interface DaySales {
  businessDate: string;
  orders: number;
  revenue: Money;
}

export interface WeekdaySales {
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  nights: number;
  orders: number;
  revenue: Money;
  /** Médias por noite aberta: pedidos com 1 casa ('8.8'), faturamento ao centavo. */
  averageOrders: string;
  averageRevenue: Money;
}

/** `GET /analytics?from&to`: tudo calculado na API (o cliente só formata). */
export interface AnalyticsReport {
  from: string;
  to: string;
  /** Último dia contado: `to`, ou hoje quando o período ainda está em andamento. */
  elapsedTo: string;
  totals: SalesTotals;
  previous: { from: string; to: string; totals: SalesTotals };
  changes: SalesChanges;
  items: { itemsSold: number; ordersWithoutItems: number };
  topProducts: ProductSales[];
  byCategory: CategorySales[];
  topNeighborhoods: NeighborhoodSales[];
  topCustomers: CustomerSales[];
  daily: DaySales[];
  byWeekday: WeekdaySales[];
  byPaymentMethod: PaymentMethodTotal[];
  withoutPaymentMethod: { count: number; total: Money };
}
