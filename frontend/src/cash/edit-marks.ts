import type { DraftLine } from './order-lines';

/** O que a linha é em relação ao pedido salvo, na edição (2026-10-15). */
export type LineMark =
  | { kind: 'new' }
  | { kind: 'quantity'; delta: number }
  | { kind: 'changed' }
  | null;

/** Adicionais, retiradas e observação: o que faz a linha ser "a mesma" de antes. */
function detailsKey(line: DraftLine): string {
  const addons = line.addons
    .map((addon) => `${addon.productId}x${addon.quantity}`)
    .sort()
    .join(',');
  const removals = line.removals.map((removal) => removal.supplyId).sort();
  return `${addons}|${removals.join(',')}|${line.note.trim()}`;
}

/**
 * Marca da linha na edição: nova, com outra quantidade (+1/−1) ou com outro adicional ou
 * observação; null = igual ao salvo. Fora da edição (`saved` vazio) nada é marcado.
 *
 * @example lineMark(linhaCom3, salvasCom2) // { kind: 'quantity', delta: 1 }
 */
export function lineMark(line: DraftLine, saved: DraftLine[]): LineMark {
  if (saved.length === 0) return null;
  const before = saved.find((s) => s.savedId === line.savedId);
  if (!before) return { kind: 'new' };
  if (detailsKey(before) !== detailsKey(line)) return { kind: 'changed' };
  const delta = line.quantity - before.quantity;
  return delta === 0 ? null : { kind: 'quantity', delta };
}

/**
 * As linhas do pedido salvo que saíram da comanda (para o "Saíram", com Desfazer).
 *
 * @example removedLines(salvas, atuais).map((l) => l.name) // ['Coca Cola 600ml']
 */
export function removedLines(
  saved: DraftLine[],
  current: DraftLine[],
): DraftLine[] {
  const kept = new Set(current.map((line) => line.savedId));
  return saved.filter((line) => !kept.has(line.savedId));
}
