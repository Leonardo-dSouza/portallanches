import { fromDbDate } from '../common/db-date.js';
import { toMilli } from '../common/quantity.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { LotBalance } from './fefo.js';

/**
 * Lote do banco → saldo em milésimos para o FEFO (contagem e baixa da venda).
 *
 * @example toBalance({ id: 1, remaining: new Prisma.Decimal('6'), expiresOn: null }) // { id: 1, remainingMilli: 6000, expiresOn: null }
 */
export function toBalance(lot: {
  id: number;
  remaining: Prisma.Decimal;
  expiresOn: Date | null;
}): LotBalance {
  return {
    id: lot.id,
    remainingMilli: toMilli(lot.remaining.toString()),
    expiresOn: lot.expiresOn && fromDbDate(lot.expiresOn),
  };
}
