import type { Order } from '../api/types';

/** Filtros da lista de pedidos (pedido do usuário, 2026-10-10): tudo cabe numa tela. */
export type OrderFilter = 'open' | 'active' | 'delivery' | 'counter' | 'all';

export const ORDER_FILTERS: readonly { id: OrderFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'open', label: 'Abertos' },
  { id: 'active', label: 'Em andamento' },
  { id: 'delivery', label: 'Entregas' },
  { id: 'counter', label: 'Balcão' },
];

/**
 * Conta aberta: balcão ainda sem forma de pagamento (paga no fim). O importado da planilha
 * também não tem forma, mas não tem tipo.
 *
 * @example isOpenAccount(contaDaMaria) // true
 */
export function isOpenAccount(order: Order): boolean {
  return order.type === 'COUNTER' && order.paymentMethodId === null;
}

const MATCHERS: Record<OrderFilter, (order: Order) => boolean> = {
  open: isOpenAccount,
  active: (order) => order.type !== null && order.status !== 'DELIVERED',
  delivery: (order) => order.type === 'DELIVERY',
  counter: (order) => order.type === 'COUNTER',
  all: () => true,
};

/** @example orders.filter((o) => matchesFilter(o, 'open')) */
export function matchesFilter(order: Order, filter: OrderFilter): boolean {
  return MATCHERS[filter](order);
}

/** @example filterCounts(day.orders).open // 2 */
export function filterCounts(orders: Order[]): Record<OrderFilter, number> {
  const count = (filter: OrderFilter) =>
    orders.filter((order) => matchesFilter(order, filter)).length;
  return {
    open: count('open'),
    active: count('active'),
    delivery: count('delivery'),
    counter: count('counter'),
    all: orders.length,
  };
}
