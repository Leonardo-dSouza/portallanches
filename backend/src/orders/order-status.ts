import type { OrderType } from './order-input.js';

/** Andamento do pedido (decisão do usuário, 2026-10-10); não tem relação com o pagamento. */
export type OrderStatus = 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

/**
 * Status válidos para cada tipo (2026-10-10): a entrega aceita DELIVERED de pedidos antigos
 * ou fechamento do dia; o balcão só PREPARING e DELIVERED.
 */
const ACCEPTED_STATUSES: Record<OrderType, readonly OrderStatus[]> = {
  DELIVERY: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  COUNTER: ['PREPARING', 'DELIVERED'],
};

/**
 * Etapas que o caixa anda para a frente: a entrega para em Saiu (2026-11-08, card 8: quem
 * entrega é o motoboy); balcão vai até Entregue.
 */
const FORWARD_FLOW: Record<OrderType, readonly OrderStatus[]> = {
  DELIVERY: ['PREPARING', 'OUT_FOR_DELIVERY'],
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
 * A entrega termina em Saiu para o caixa (2026-11-08, card 8); balcão vai a Entregue.
 *
 * @example stepStatus('DELIVERY', 'PREPARING', 1) // 'OUT_FOR_DELIVERY'
 */
export function stepStatus(
  type: OrderType,
  status: OrderStatus,
  direction: 1 | -1,
): OrderStatus | null {
  if (direction === 1) {
    const flow = FORWARD_FLOW[type];
    const index = flow.indexOf(status);
    return index >= 0 ? (flow[index + 1] ?? null) : null;
  }
  const flow = ACCEPTED_STATUSES[type];
  const index = flow.indexOf(status);
  return index > 0 ? (flow[index - 1] ?? null) : null;
}

/**
 * Status depois de trocar o tipo na edição: o que não existe no fluxo novo ("Saiu" no balcão)
 * volta para Em preparo. Entrega mantém Entregue de pedidos fechados/antigos (2026-11-08, card 8).
 *
 * @example statusForType('COUNTER', 'OUT_FOR_DELIVERY') // 'PREPARING'
 */
export function statusForType(
  type: OrderType,
  status: OrderStatus,
): OrderStatus {
  return ACCEPTED_STATUSES[type].includes(status) ? status : 'PREPARING';
}
