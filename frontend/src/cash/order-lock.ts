import type { Order, UserRole } from '../api/types';

/**
 * Espelho da trava do backend (`orders/order-lock.ts`), só para a janela já mostrar o campo da
 * senha do admin: fora de "Em preparo E com até `minutes` de lançado", o caixa precisa dela. A
 * API é quem decide (relógio do servidor).
 *
 * @example needsManager(pedido, new Date(), 15, 'CAIXA') // true depois dos 15 min
 */
export function needsManager(
  order: Pick<Order, 'status' | 'createdAt'>,
  now: Date,
  minutes: number,
  role: UserRole | undefined,
): boolean {
  if (role === 'ADMIN') return false;
  const ageMs = now.getTime() - Date.parse(order.createdAt);
  return !(order.status === 'PREPARING' && ageMs < minutes * 60_000);
}
