import type { OrderStatus, UserRole } from '../api/types';

/** O que a trava olha: a hora do lançamento e, no pedido, o status (o recebimento não tem). */
export interface LockSubject {
  createdAt: string;
  status?: OrderStatus;
}

/**
 * Espelho da trava do backend (`orders/order-lock.ts`), só para a janela já mostrar o campo da
 * senha do admin: fora de "Em preparo E com até `minutes` de lançado", o caixa precisa dela. A
 * API é quem decide (relógio do servidor). Sem status (o recebimento do fiado), só o tempo.
 *
 * @example needsManager(pedido, new Date(), 15, 'CAIXA') // true depois dos 15 min
 */
export function needsManager(
  subject: LockSubject,
  now: Date,
  minutes: number,
  role: UserRole | undefined,
): boolean {
  if (role === 'ADMIN') return false;
  const ageMs = now.getTime() - Date.parse(subject.createdAt);
  const preparing =
    subject.status === undefined || subject.status === 'PREPARING';
  return !(preparing && ageMs < minutes * 60_000);
}
