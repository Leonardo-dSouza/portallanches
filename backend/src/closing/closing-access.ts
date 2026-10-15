import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import type { ClosingRecord } from './closing-repository.js';

/**
 * Datas que o usuário abre: admin qualquer uma; caixa só a noite em andamento (`liveNightDates`:
 * hoje e, de madrugada, ontem). Decisão do usuário, 2026-10-15: lançar em dia passado é do admin.
 *
 * @example assertCanSelectDate(user, '2026-09-21', ['2026-09-22', '2026-09-21'])
 */
export function assertCanSelectDate(
  user: SessionUser,
  businessDate: string,
  liveDates: string[],
): void {
  if (user.role === 'ADMIN') return;
  if (liveDates.includes(businessDate)) return;
  throw new ForbiddenException(
    `Perfil CAIXA só abre a noite em andamento: esperado ${liveDates.join(' ou ')}, recebido ${businessDate} (dia passado é com o admin)`,
  );
}

/**
 * Quem pode lançar/editar dados de um fechamento: admin em qualquer dia; caixa só na noite em
 * andamento e enquanto o fechamento estiver aberto.
 *
 * @example assertCanEditClosing(user, closing, ['2026-09-22'])
 */
export function assertCanEditClosing(
  user: SessionUser,
  closing: ClosingRecord,
  liveDates: string[],
): void {
  if (user.role === 'ADMIN') return;
  assertCanSelectDate(user, closing.businessDate, liveDates);
  if (closing.status === 'CLOSED') {
    throw new ForbiddenException(
      `O fechamento de ${closing.businessDate} está fechado: só um ADMIN pode reabrir ou editar`,
    );
  }
}

/**
 * Quem pode reabrir: admin qualquer dia; o caixa só a noite em andamento (fechada por engano
 * com cliente ainda chegando) e, desde 2026-10-15, com a senha do admin (o serviço confere).
 *
 * @example assertCanReopen(user, closing, ['2026-09-22'])
 */
export function assertCanReopen(
  user: SessionUser,
  closing: ClosingRecord,
  liveDates: string[],
): void {
  if (user.role === 'ADMIN') return;
  assertCanSelectDate(user, closing.businessDate, liveDates);
}
