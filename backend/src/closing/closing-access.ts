import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { shiftBusinessDate } from './business-date.js';
import type { ClosingRecord } from './closing-repository.js';

/** Quantos dias para trás o caixa pode escolher (admin não tem limite). */
export const SELECTABLE_DAYS_BACK = 7;

/**
 * Datas que o usuário pode abrir: admin qualquer uma; caixa hoje e os
 * `SELECTABLE_DAYS_BACK` dias anteriores (evita fechamentos criados por clique errado no calendário).
 *
 * @example assertCanSelectDate(user, '2026-09-20', '2026-09-22')
 */
export function assertCanSelectDate(
  user: SessionUser,
  businessDate: string,
  today: string,
): void {
  if (user.role === 'ADMIN') return;
  const oldest = shiftBusinessDate(today, -SELECTABLE_DAYS_BACK);
  if (businessDate >= oldest && businessDate <= today) return;
  throw new ForbiddenException(
    `Perfil CAIXA só acessa hoje e os ${SELECTABLE_DAYS_BACK} dias anteriores: esperado data entre ${oldest} e ${today}, recebido ${businessDate}`,
  );
}

/**
 * Quem pode lançar/editar dados de um fechamento: admin em qualquer dia; caixa só
 * dentro da janela de datas e enquanto o fechamento estiver aberto.
 *
 * @example assertCanEditClosing(user, closing, '2026-09-22')
 */
export function assertCanEditClosing(
  user: SessionUser,
  closing: ClosingRecord,
  today: string,
): void {
  if (user.role === 'ADMIN') return;
  assertCanSelectDate(user, closing.businessDate, today);
  if (closing.status === 'CLOSED') {
    throw new ForbiddenException(
      `O fechamento de ${closing.businessDate} está fechado: só um ADMIN pode reabrir ou editar`,
    );
  }
}
