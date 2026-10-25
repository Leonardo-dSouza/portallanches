import { UnprocessableEntityException } from '@nestjs/common';
import { formatCents, toCents } from '../common/money.js';
import type { OutsideSnapshot } from './purchase-records.js';

const centsOf = (items: OutsideSnapshot['items']): number =>
  items.reduce((sum, item) => sum + toCents(item.total), 0);

/**
 * Valor do gasto depois de trocar os itens de fora em Compras (2026-10-25): pela diferença, para
 * não perder um ajuste feito à mão no Caixa. Marcar desconta o total da linha; desmarcar devolve.
 * Gasto zerado ou negativo é 422 (o admin ajusta o valor no Caixa antes).
 *
 * @example rebalancedExpenseAmount({ expenseAmount: '447.26', items, … }, [9]) // '442.37'
 */
export function rebalancedExpenseAmount(
  snapshot: OutsideSnapshot,
  positions: number[],
): string {
  const chosen = new Set(positions);
  const before = centsOf(snapshot.items.filter((item) => item.outsideBusiness));
  const after = centsOf(
    snapshot.items.filter((item) => chosen.has(item.position)),
  );
  const cents = toCents(snapshot.expenseAmount) + before - after;
  if (cents > 0) return formatCents(cents);
  throw new UnprocessableEntityException(
    `O gasto #${snapshot.expenseId} ficaria com R$ ${formatCents(cents)} (lançado R$ ${snapshot.expenseAmount}, itens de fora R$ ${formatCents(after)}): esperado valor maior que zero; ajuste o gasto no Caixa antes`,
  );
}
