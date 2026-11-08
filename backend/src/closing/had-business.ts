/** Pedido como chega às leituras de relatório e análise para checagem de expediente. */
export interface BusinessOrderCandidate {
  canceled?: unknown;
  canceledAt?: unknown;
}

/**
 * Decide se a noite teve expediente a partir dos pedidos dela (função pura):
 * tem expediente se houver pelo menos um pedido válido (não cancelado).
 * Uma noite sem nenhum pedido ou com todos cancelados é "Sem expediente".
 *
 * @example hadBusiness([]) // false
 * @example hadBusiness([{ canceled: { dayNumber: 1, reason: 'erro' } }]) // false
 * @example hadBusiness([{ amount: '30.00' }]) // true
 */
export function hadBusiness(
  orders: readonly BusinessOrderCandidate[],
): boolean {
  // A diária do motoboy e as médias só contam quando houve trabalho de verdade na cozinha.
  return orders.some((order) => !order.canceled && !order.canceledAt);
}
