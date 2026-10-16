import type { Order, OrderStatus, OrderType } from '../api/types';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PREPARING: 'Em preparo',
  OUT_FOR_DELIVERY: 'Saiu',
  DELIVERED: 'Entregue',
};

/** @example statusLabel('OUT_FOR_DELIVERY') // 'Saiu' */
export function statusLabel(status: OrderStatus): string {
  return STATUS_LABEL[status];
}

/** A seta de voltar um passo (todo fluxo começa em Em preparo). */
export function canRevert(order: Order): boolean {
  return order.type !== null && order.status !== 'PREPARING';
}

/** Entrega: Em preparo → Saiu → Entregue. Balcão: Em preparo → Entregue (espelha o backend). */
const STATUS_FLOW: Record<OrderType, readonly OrderStatus[]> = {
  DELIVERY: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  COUNTER: ['PREPARING', 'DELIVERED'],
};

/** Nome curto da etapa na trilha da lista (o "Em preparo" inteiro não cabe com as outras). */
const STEP_LABEL: Record<OrderStatus, string> = {
  PREPARING: 'Preparo',
  OUT_FOR_DELIVERY: 'Saiu',
  DELIVERED: 'Entregue',
};

/** @example stepLabel('PREPARING') // 'Preparo' */
export function stepLabel(status: OrderStatus): string {
  return STEP_LABEL[status];
}

/**
 * As etapas do tipo, para a trilha da lista (2026-10-15).
 *
 * @example statusSteps('COUNTER') // ['PREPARING', 'DELIVERED']
 */
export function statusSteps(type: OrderType): readonly OrderStatus[] {
  return STATUS_FLOW[type];
}

/**
 * A etapa que o botão da lista marca; null no fim do fluxo ou no importado da planilha.
 *
 * @example nextStatus(entregaEmPreparo) // 'OUT_FOR_DELIVERY'
 */
export function nextStatus(order: Order): OrderStatus | null {
  if (order.type === null) return null;
  const flow = STATUS_FLOW[order.type];
  return flow[flow.indexOf(order.status) + 1] ?? null;
}

/**
 * Há quanto tempo o pedido está na etapa ("há 12 min", "há 1 h 05"); relógio adiantado no
 * servidor vira "agora".
 *
 * @example elapsedLabel('2026-09-22T23:00:00Z', new Date('2026-09-22T23:12:30Z')) // 'há 12 min'
 */
export function elapsedLabel(since: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - Date.parse(since)) / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const rest = String(minutes % 60).padStart(2, '0');
  return `há ${Math.floor(minutes / 60)} h ${rest}`;
}
