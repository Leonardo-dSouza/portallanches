import type { OrderEntry } from './order-pricing.js';

/** Produto, pão, adicionais por unidade, retiradas e observação: o que faz duas linhas iguais. */
function entryKey(entry: OrderEntry): string {
  const addons = entry.addons
    .map(
      (addon) => `${addon.productId}x${addon.quantity / (entry.quantity || 1)}`,
    )
    .sort((a, b) => a.localeCompare(b))
    .join(',');
  const removals = entry.removals
    .map((removal) => removal.supplyId)
    .sort((a, b) => a - b)
    .join(',');
  const choice = entry.choice?.productId ?? '';
  return `${entry.productId}|${choice}|${addons}|${removals}|${entry.note ?? ''}`;
}

function quantitiesByKey(entries: OrderEntry[]): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const entry of entries) {
    const key = entryKey(entry);
    quantities.set(key, (quantities.get(key) ?? 0) + entry.quantity);
  }
  return quantities;
}

/**
 * Se a edição acrescentou algum item ao pedido (alguma quantidade a mais por produto + pão
 * da escolha + adicionais por unidade + retiradas + observação). Edição que só tira itens ou
 * mantém as quantidades retorna falso.
 *
 * @example hasAddedEntries([2× X Salada], [3× X Salada]) // true
 */
export function hasAddedEntries(
  before: OrderEntry[],
  after: OrderEntry[],
): boolean {
  const remaining = quantitiesByKey(before);
  for (const entry of after) {
    const key = entryKey(entry);
    const had = remaining.get(key) ?? 0;
    if (entry.quantity > had) return true;
    remaining.set(key, had - entry.quantity);
  }
  return false;
}
