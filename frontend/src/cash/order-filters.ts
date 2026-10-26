import type { Order } from '../api/types';

/** Filtros da lista de pedidos (pedido do usuário, 2026-10-10): tudo cabe numa tela. */
export type OrderFilter =
  'open' | 'preparing' | 'delivery' | 'counter' | 'all' | 'canceled';

export const ORDER_FILTERS: readonly { id: OrderFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'open', label: 'A pagar' },
  { id: 'preparing', label: 'Em preparo' },
  { id: 'delivery', label: 'Entregas' },
  { id: 'counter', label: 'Balcão' },
  { id: 'canceled', label: 'Cancelados' },
];

/**
 * Cancelado (2026-10-15): só aparece no filtro Cancelados; os outros (e as contagens) o ignoram.
 *
 * @example isCanceled(pedidoCancelado) // true
 */
export function isCanceled(order: Order): boolean {
  return order.canceledAt !== null;
}

/**
 * Conta aberta: balcão ainda sem forma de pagamento (paga no fim). O importado da planilha
 * também não tem forma, mas não tem tipo.
 *
 * @example isOpenAccount(contaDaMaria) // true
 */
export function isOpenAccount(order: Order): boolean {
  return order.type === 'COUNTER' && order.paymentMethodId === null;
}

const MATCHERS: Record<
  Exclude<OrderFilter, 'canceled'>,
  (order: Order) => boolean
> = {
  open: isOpenAccount,
  // Era "Em andamento" (tudo menos entregue); virou "Em preparo" a pedido do usuário
  // (2026-10-11), e o que já saiu fica em Todos e Entregas.
  preparing: (order) => order.type !== null && order.status === 'PREPARING',
  delivery: (order) => order.type === 'DELIVERY',
  counter: (order) => order.type === 'COUNTER',
  all: () => true,
};

/** @example orders.filter((o) => matchesFilter(o, 'open')) */
export function matchesFilter(order: Order, filter: OrderFilter): boolean {
  if (filter === 'canceled') return isCanceled(order);
  return !isCanceled(order) && MATCHERS[filter](order);
}

/**
 * Mais novo em cima (pedido do usuário, 2026-10-25): o último lançado aparece sem rolar a
 * tela. Pelo id, que cresce a cada pedido salvo; a API manda em ordem crescente.
 *
 * @example newestFirst([pedido1, pedido2]) // [pedido2, pedido1]
 */
export function newestFirst(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => b.id - a.id);
}

/** @example filterCounts(day.orders).open // 2 */
export function filterCounts(orders: Order[]): Record<OrderFilter, number> {
  const count = (filter: OrderFilter) =>
    orders.filter((order) => matchesFilter(order, filter)).length;
  return {
    open: count('open'),
    preparing: count('preparing'),
    delivery: count('delivery'),
    counter: count('counter'),
    all: count('all'),
    canceled: count('canceled'),
  };
}
