import type { OrderItem } from '../api/types';

/** Produto, adicionais, retiradas e observação: o que faz dois itens gravados iguais. */
function itemKey(item: OrderItem): string {
  const addons = item.addons
    .map((addon) => `${addon.productId}x${addon.quantity / item.quantity}`)
    .sort()
    .join(',');
  const removals = item.removals.map((removal) => removal.supplyId).sort();
  return `${item.productId}|${addons}|${removals.join(',')}|${item.note ?? ''}`;
}

function quantitiesByKey(items: OrderItem[]): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const item of items) {
    const key = itemKey(item);
    quantities.set(key, (quantities.get(key) ?? 0) + item.quantity);
  }
  return quantities;
}

/** O item com outra quantidade, e os adicionais (total) na mesma proporção. */
function withQuantity(item: OrderItem, quantity: number): OrderItem {
  return {
    ...item,
    quantity,
    addons: item.addons.map((addon) => ({
      ...addon,
      quantity: (addon.quantity / item.quantity) * quantity,
    })),
  };
}

/**
 * Quanto de cada item de `after` é novo em relação a `before` (mesma ordem de `after`). Compara
 * por produto, adicionais por unidade e observação; o mesmo lanche com outro adicional conta
 * como item novo.
 *
 * @example addedQuantities([2× X Salada], [3× X Salada, 1× Coca]) // [1, 1]
 */
export function addedQuantities(
  before: OrderItem[],
  after: OrderItem[],
): number[] {
  const remaining = quantitiesByKey(before);
  return after.map((item) => {
    const key = itemKey(item);
    const had = remaining.get(key) ?? 0;
    const kept = Math.min(had, item.quantity);
    remaining.set(key, had - kept);
    return item.quantity - kept;
  });
}

/**
 * O que a edição acrescentou ao pedido, só o que é a mais. Ao contrário (`addedItems(depois,
 * antes)`), o que saiu.
 *
 * @example addedItems(antes.items, depois.items) // [1× Coca Cola 600ml]
 */
export function addedItems(
  before: OrderItem[],
  after: OrderItem[],
): OrderItem[] {
  const extras = addedQuantities(before, after);
  return after.flatMap((item, index) =>
    extras[index] > 0 ? [withQuantity(item, extras[index])] : [],
  );
}

/**
 * Se a edição mexeu nos itens (acrescentou ou tirou): só então a comanda sai de novo
 * (2026-10-15: inteira, com "ALTERADO"; trocar só pagamento ou endereço não imprime).
 *
 * @example itemsChanged(antes.items, depois.items) // true
 */
export function itemsChanged(before: OrderItem[], after: OrderItem[]): boolean {
  return (
    addedItems(before, after).length > 0 || addedItems(after, before).length > 0
  );
}
