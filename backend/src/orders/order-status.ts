import type { OrderType } from './order-input.js';

/** Andamento do pedido (decisão do usuário, 2026-10-10); não tem relação com o pagamento. */
export type OrderStatus = 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

/** Entrega: Em preparo → Saiu → Entregue. Balcão: Em preparo → Entregue. */
const STATUS_FLOW: Record<OrderType, readonly OrderStatus[]> = {
  DELIVERY: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  COUNTER: ['PREPARING', 'DELIVERED'],
};

/**
 * Status de um pedido novo: na noite em andamento vai para a chapa; num caixa atrasado
 * (comanda de papel lançada depois) já foi entregue.
 *
 * @example initialStatus(true) // 'PREPARING'
 */
export function initialStatus(live: boolean): OrderStatus {
  return live ? 'PREPARING' : 'DELIVERED';
}

/**
 * Um passo para a frente (1) ou para trás (-1) no fluxo do tipo; null nas pontas.
 *
 * @example stepStatus('DELIVERY', 'PREPARING', 1) // 'OUT_FOR_DELIVERY'
 */
export function stepStatus(
  type: OrderType,
  status: OrderStatus,
  direction: 1 | -1,
): OrderStatus | null {
  const flow = STATUS_FLOW[type];
  return flow[flow.indexOf(status) + direction] ?? null;
}

/**
 * Status depois de trocar o tipo na edição: o que não existe no fluxo novo ("Saiu" no balcão)
 * volta para Em preparo.
 *
 * @example statusForType('COUNTER', 'OUT_FOR_DELIVERY') // 'PREPARING'
 */
export function statusForType(
  type: OrderType,
  status: OrderStatus,
): OrderStatus {
  return STATUS_FLOW[type].includes(status) ? status : 'PREPARING';
}
