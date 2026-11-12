import { ConflictException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { parseObject } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import type { ClosingRecord } from './closing-repository.js';

/** Formata o valor monetário da API no padrão brasileiro ('30.00' → 'R$ 30,00'). */
export function formatBrlCurrency(amount: string): string {
  const [integers, cents = '00'] = amount.split('.');
  return `R$ ${integers},${cents.padEnd(2, '0')}`;
}

/**
 * Lê o valor do troco inicial do corpo da abertura ({ amount: '30.00' }).
 *
 * @example parseDrawerOpeningInput({ amount: '30.00' }) // '30.00'
 */
export function parseDrawerOpeningInput(body: unknown): string {
  const fields = parseObject(body, 'abertura da gaveta ({ amount })');
  return parseMoney(fields.amount, 'amount', true);
}

/**
 * Caixa só informa o troco inicial uma vez na noite aberta; admin corrige quando quiser.
 *
 * @example assertCanOpenDrawer(caixa, closing)
 */
export function assertCanOpenDrawer(
  user: SessionUser,
  closing: ClosingRecord,
): void {
  if (user.role === 'ADMIN') return;
  if (closing.openingCash !== null) throw openingTaken(closing.openingCash);
}

/**
 * A recusa do caixa que tenta abrir uma noite já aberta, com o troco que ficou gravado.
 *
 * @example throw openingTaken('30.00') // 409 "Troco inicial já informado: R$ 30,00; ..."
 */
export function openingTaken(storedAmount: string): ConflictException {
  return new ConflictException(
    `Troco inicial já informado: ${formatBrlCurrency(storedAmount)}; corrigir é com o admin`,
  );
}
