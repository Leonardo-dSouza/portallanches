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

/**
 * Etapas que o caixa anda para a frente (espelha o backend): entrega termina em Saiu
 * (2026-11-08, card 8: quem entrega é o motoboy); balcão vai a Entregue.
 */
const CASHIER_FLOW: Record<OrderType, readonly OrderStatus[]> = {
  DELIVERY: ['PREPARING', 'OUT_FOR_DELIVERY'],
  COUNTER: ['PREPARING', 'DELIVERED'],
};

/** Trilha completa para pedidos antigos ou fechados que já estão Entregues (2026-11-08, card 8). */
const DELIVERED_DELIVERY_STEPS: readonly OrderStatus[] = [
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

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
 * As etapas do tipo para a trilha da lista (2026-10-15; 2026-11-08, card 8: entrega normal
 * mostra Preparo › Saiu; se já estiver Entregue, mostra Preparo › Saiu › Entregue).
 *
 * @example statusSteps('DELIVERY') // ['PREPARING', 'OUT_FOR_DELIVERY']
 * @example statusSteps('DELIVERY', 'DELIVERED') // ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED']
 */
export function statusSteps(
  type: OrderType,
  current?: OrderStatus,
): readonly OrderStatus[] {
  if (type === 'DELIVERY' && current === 'DELIVERED') {
    return DELIVERED_DELIVERY_STEPS;
  }
  return CASHIER_FLOW[type];
}

/**
 * A etapa que o botão da lista marca; null no fim do fluxo que o caixa anda ou no importado.
 *
 * @example nextStatus(entregaEmPreparo) // 'OUT_FOR_DELIVERY'
 */
export function nextStatus(order: Order): OrderStatus | null {
  if (order.type === null) return null;
  const flow = CASHIER_FLOW[order.type];
  const index = flow.indexOf(order.status);
  return index >= 0 ? (flow[index + 1] ?? null) : null;
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

/**
 * Se o "há N min" aparece: falso quando o pedido está no fim do fluxo que o caixa anda
 * (entrega em Saiu, balcão em Entregue) e em DELIVERED; continua verdadeiro em Em preparo
 * (2026-11-08, card 8). Entregue, cancelado ou importado não mostram (2026-10-16).
 *
 * @example showsElapsed(pedidoEmPreparo) // true
 * @example showsElapsed(entregaEmSaiu) // false
 */
export function showsElapsed(order: Order): boolean {
  if (order.type === null || order.canceledAt !== null) return false;
  if (order.status === 'DELIVERED') return false;
  const flow = CASHIER_FLOW[order.type];
  return order.status !== flow[flow.length - 1];
}
