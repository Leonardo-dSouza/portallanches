import { formatCents, toCents } from '../common/money.js';
import { sumCents } from '../report/report-builder.js';
import type { ReportOrderRow } from '../report/report-source.js';

/** Números de cabeça do período (dinheiro como texto com 2 casas, igual ao resto da API). */
export interface SalesTotals {
  orders: number;
  revenue: string;
  /** Faturamento ÷ pedidos, arredondado ao centavo; '0.00' sem pedidos. */
  averageTicket: string;
  counter: number;
  deliveries: number;
  deliveryFees: string;
}

/** Variação % de cada número em relação ao período anterior; null quando o anterior é zero. */
export interface SalesChanges {
  revenue: string | null;
  orders: string | null;
  averageTicket: string | null;
  deliveries: string | null;
}

/**
 * Soma os pedidos em centavos. Pedido importado (sem tipo) entra no faturamento, mas não
 * conta como balcão nem como entrega.
 *
 * @example salesTotals(orders).averageTicket // '26.33'
 */
export function salesTotals(orders: ReportOrderRow[]): SalesTotals {
  const revenueCents = sumCents(orders.map((o) => o.amount));
  const ticketCents = orders.length ? revenueCents / orders.length : 0;
  return {
    orders: orders.length,
    revenue: formatCents(revenueCents),
    averageTicket: formatCents(Math.round(ticketCents)),
    counter: orders.filter((o) => o.type === 'COUNTER').length,
    deliveries: orders.filter((o) => o.type === 'DELIVERY').length,
    deliveryFees: formatCents(
      sumCents(orders.flatMap((o) => (o.deliveryFee ? [o.deliveryFee] : []))),
    ),
  };
}

/**
 * Variação percentual com 1 casa; null quando não há base de comparação.
 *
 * @example percentChange(110, 100) // '10.0'
 */
export function percentChange(
  current: number,
  previous: number,
): string | null {
  if (previous === 0) return null;
  return (Math.round(((current - previous) * 1000) / previous) / 10).toFixed(1);
}

/** @example salesChanges(thisWeek, lastWeek).revenue // '12.5' */
export function salesChanges(
  current: SalesTotals,
  previous: SalesTotals,
): SalesChanges {
  const money = (key: 'revenue' | 'averageTicket') =>
    percentChange(toCents(current[key]), toCents(previous[key]));
  return {
    revenue: money('revenue'),
    orders: percentChange(current.orders, previous.orders),
    averageTicket: money('averageTicket'),
    deliveries: percentChange(current.deliveries, previous.deliveries),
  };
}
