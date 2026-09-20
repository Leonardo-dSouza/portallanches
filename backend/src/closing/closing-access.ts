import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import type { ClosingRecord } from './closing-repository.js';

/**
 * Quem pode lançar/editar dados de um fechamento: admin em qualquer dia; caixa só
 * no fechamento de hoje e enquanto ele estiver aberto.
 *
 * @example assertCanEditClosing(user, today, order.closingId)
 */
export function assertCanEditClosing(
  user: SessionUser,
  today: ClosingRecord,
  targetClosingId: number,
): void {
  if (user.role === 'ADMIN') return;
  if (targetClosingId !== today.id) {
    throw new ForbiddenException(
      `Perfil CAIXA só edita dados de hoje (${today.businessDate}): esperado fechamento ${today.id}, recebido ${targetClosingId}`,
    );
  }
  if (today.status === 'CLOSED') {
    throw new ForbiddenException(
      `O fechamento de ${today.businessDate} está fechado: só um ADMIN pode reabrir ou editar`,
    );
  }
}
