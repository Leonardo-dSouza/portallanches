import type { Order, OrderStatus } from '../api/types';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PREPARING: 'Em preparo',
  OUT_FOR_DELIVERY: 'Saiu',
  DELIVERED: 'Entregue',
};

/** @example statusLabel('OUT_FOR_DELIVERY') // 'Saiu' */
export function statusLabel(status: OrderStatus): string {
  return STATUS_LABEL[status];
}

/**
 * Se o clique no status avança (todo fluxo termina em Entregue). O importado da planilha não
 * tem status para mudar.
 *
 * @example canAdvance(pedidoEmPreparo) // true
 */
export function canAdvance(order: Order): boolean {
  return order.type !== null && order.status !== 'DELIVERED';
}

/** A seta de voltar um passo (todo fluxo começa em Em preparo). */
export function canRevert(order: Order): boolean {
  return order.type !== null && order.status !== 'PREPARING';
}
