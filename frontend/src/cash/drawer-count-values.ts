import { toApiMoney } from '../api/money';
import type { DrawerCount, DrawerToCount } from '../api/types';

export type DrawerCountResult =
  { ok: true; count: DrawerCount } | { ok: false; error: string };

/**
 * Rótulo do campo de contagem da forma (no dinheiro lembra do troco inicial).
 *
 * @example drawerCountFieldLabel({ paymentMethodId: 1, name: 'Dinheiro', isCash: true }) // 'Dinheiro (com o troco inicial)'
 * @example drawerCountFieldLabel({ paymentMethodId: 2, name: 'PIX', isCash: false }) // 'PIX'
 */
export function drawerCountFieldLabel(toCount: DrawerToCount): string {
  return toCount.isCash
    ? `${toCount.name} (com o troco inicial)`
    : toCount.name;
}

/** Valida a observação da contagem (opcional, até 500 caracteres). */
function parseDrawerNote(
  rawNote: string,
): { ok: true; note: string | null } | { ok: false; error: string } {
  const trimmed = rawNote.trim();
  if (trimmed.length === 0) return { ok: true, note: null };
  if (trimmed.length > 500) {
    return {
      ok: false,
      error: `A observação passa de 500 caracteres: recebido ${trimmed.length}`,
    };
  }
  return { ok: true, note: trimmed };
}

/** Valida o valor digitado de uma forma no formulário de contagem. */
function parseCountAmount(
  name: string,
  typed: string | undefined,
): { ok: true; amount: string } | { ok: false; error: string } {
  const raw = (typed ?? '').trim();
  if (raw === '') {
    return { ok: false, error: `Falta a contagem de: ${name}` };
  }
  const parsed = toApiMoney(raw);
  if (parsed === null) {
    return {
      ok: false,
      error: `Valor inválido em ${name}: recebido "${raw}", esperado valor em reais (ex.: 12,50)`,
    };
  }
  return { ok: true, amount: parsed };
}

/**
 * Valida a contagem da gaveta digitada pelo operador e monta o corpo da API.
 *
 * @example buildDrawerCount([{ paymentMethodId: 1, name: 'PIX', isCash: false }], { 1: '50,00' }, '')
 */
export function buildDrawerCount(
  toCount: readonly DrawerToCount[],
  values: Readonly<Record<number, string>>,
  note: string,
): DrawerCountResult {
  const noteResult = parseDrawerNote(note);
  if (!noteResult.ok) return noteResult;

  const counts: DrawerCount['counts'] = [];
  for (const item of toCount) {
    const amountResult = parseCountAmount(
      item.name,
      values[item.paymentMethodId],
    );
    if (!amountResult.ok) return amountResult;
    counts.push({
      paymentMethodId: item.paymentMethodId,
      amount: amountResult.amount,
    });
  }
  return { ok: true, count: { counts, note: noteResult.note } };
}
