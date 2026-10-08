import { formatCents, toCents } from '../common/money.js';
import type { AnalyticsOrderRow } from './analytics-source.js';

export interface NeighborhoodSales {
  neighborhood: string;
  deliveries: number;
  revenue: string;
}

export interface CustomerSales {
  customerId: number;
  /** Nome do pedido mais recente (o cadastro pode ter mudado). */
  name: string;
  orders: number;
  revenue: string;
}

interface Group {
  label: string;
  count: number;
  cents: number;
}

/** Conta e soma (centavos) os pedidos por chave; `label` fica o do último pedido. */
function groupOrders(
  orders: AnalyticsOrderRow[],
  keyOf: (order: AnalyticsOrderRow) => string | number | null,
  labelOf: (order: AnalyticsOrderRow) => string,
): Map<string | number, Group> {
  const groups = new Map<string | number, Group>();
  for (const order of orders) {
    const key = keyOf(order);
    if (key === null) continue;
    const current = groups.get(key);
    groups.set(key, {
      label: labelOf(order),
      count: (current?.count ?? 0) + 1,
      cents: (current?.cents ?? 0) + toCents(order.amount),
    });
  }
  return groups;
}

const byCountThenCents = (a: Group, b: Group): number =>
  b.count - a.count || b.cents - a.cents;

/**
 * Bairros com mais entregas, com o faturamento delas (itens + taxa).
 *
 * @example topNeighborhoods(orders, 10)[0] // { neighborhood: 'Centro', deliveries: 12, revenue: '540.00' }
 */
export function topNeighborhoods(
  orders: AnalyticsOrderRow[],
  limit: number,
): NeighborhoodSales[] {
  const groups = groupOrders(
    orders,
    (o) => (o.type === 'DELIVERY' ? o.neighborhood : null),
    (o) => o.neighborhood ?? '',
  );
  return [...groups.values()]
    .sort(byCountThenCents)
    .slice(0, limit)
    .map((g) => ({
      neighborhood: g.label,
      deliveries: g.count,
      revenue: formatCents(g.cents),
    }));
}

/**
 * Clientes que mais pedem (só entregas têm cliente), com o total gasto.
 *
 * @example topCustomers(orders, 10)[0] // { name: 'Ana', orders: 6, revenue: '230.00', ... }
 */
export function topCustomers(
  orders: AnalyticsOrderRow[],
  limit: number,
): CustomerSales[] {
  const groups = groupOrders(
    orders,
    (o) => o.customerId,
    (o) => o.customerName ?? '',
  );
  return [...groups.entries()]
    .sort(([, a], [, b]) => byCountThenCents(a, b))
    .slice(0, limit)
    .map(([customerId, g]) => ({
      customerId: Number(customerId),
      name: g.label,
      orders: g.count,
      revenue: formatCents(g.cents),
    }));
}
