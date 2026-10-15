import type { OrderRecord } from './order-repository.js';

/**
 * Se o pedido já saiu da mão do caixa (2026-10-15): fora de "Em preparo E com até `minutes`
 * de lançado", cancelar, baixar o valor ou trocar a forma pedem a senha do admin. O tempo fecha
 * a brecha de deixar o pedido "Em preparo" para sempre; 0 = sempre pedir.
 *
 * @example isLockedForCashier({ status: 'PREPARING', createdAt }, agora, 15) // false nos 15 min
 */
export function isLockedForCashier(
  order: Pick<OrderRecord, 'status' | 'createdAt'>,
  now: Date,
  minutes: number,
): boolean {
  const ageMs = now.getTime() - order.createdAt.getTime();
  return !(order.status === 'PREPARING' && ageMs < minutes * 60_000);
}
