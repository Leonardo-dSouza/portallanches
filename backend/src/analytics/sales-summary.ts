import { formatCents, toCents } from '../common/money.js';
import { remainingCents } from '../orders/order-fiado.js';
import { sumCents } from '../report/report-builder.js';
import type { ReportOrderRow } from '../report/report-source.js';
import {
  paidOnTheSpot,
  revenueCents,
  type FiadoCash,
} from '../report/revenue.js';
import type { AnalyticsFiadoBalanceRow } from './analytics-source.js';

/** Números de cabeça do período (dinheiro como texto com 2 casas, igual ao resto da API). */
export interface SalesTotals {
  /** Todos os pedidos, os fiados também: é o que saiu da cozinha. */
  orders: number;
  /** Por recebimento (2026-11-01): `report/revenue.ts`. */
  revenue: string;
  /** Pago na hora ÷ pedidos sem fiado, arredondado ao centavo; '0.00' sem pedidos. */
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

/** O ticket vale só para o pago na hora: um recebimento de fiado não é um pedido da noite. */
function averageTicketCents(paid: ReportOrderRow[]): number {
  if (paid.length === 0) return 0;
  return Math.round(sumCents(paid.map((o) => o.amount)) / paid.length);
}

/**
 * Soma os pedidos em centavos, com o faturamento por recebimento. Pedido importado (sem tipo)
 * entra no faturamento, mas não conta como balcão nem como entrega.
 *
 * @example salesTotals(orders, { payments, methods }).averageTicket // '26.33'
 */
export function salesTotals(
  orders: ReportOrderRow[],
  { payments, methods }: FiadoCash,
): SalesTotals {
  return {
    orders: orders.length,
    revenue: formatCents(revenueCents(orders, payments, methods)),
    averageTicket: formatCents(
      averageTicketCents(paidOnTheSpot(orders, methods)),
    ),
    counter: orders.filter((o) => o.type === 'COUNTER').length,
    deliveries: orders.filter((o) => o.type === 'DELIVERY').length,
    deliveryFees: formatCents(
      sumCents(orders.flatMap((o) => (o.deliveryFee ? [o.deliveryFee] : []))),
    ),
  };
}

/** O que falta receber dos fiados vendidos no período (2026-11-01). */
export interface FiadoToReceive {
  count: number;
  total: string;
}

/**
 * Quanto falta nos fiados do período, com o que foi pago até hoje em qualquer noite.
 *
 * @example fiadoToReceive([{ amount: '40.00', paid: '10.00' }]) // { count: 1, total: '30.00' }
 */
export function fiadoToReceive(
  balances: AnalyticsFiadoBalanceRow[],
): FiadoToReceive {
  const missing = balances
    .map((row) => remainingCents({ ...row, canceled: false }))
    .filter((cents) => cents > 0);
  return {
    count: missing.length,
    total: formatCents(missing.reduce((sum, cents) => sum + cents, 0)),
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
