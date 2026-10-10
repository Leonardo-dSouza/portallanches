import type { OrderItem } from '../api/types';

/** Produto, adicionais por unidade e observação: o que faz dois itens gravados iguais. */
function itemKey(item: OrderItem): string {
  const addons = item.addons
    .map((addon) => `${addon.productId}x${addon.quantity / item.quantity}`)
    .sort()
    .join(',');
  return `${item.productId}|${addons}|${item.note ?? ''}`;
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
 * O que a edição acrescentou ao pedido, para o cupom de ADIÇÃO (decisão do usuário,
 * 2026-10-10: a chapa não refaz o pedido inteiro). Compara por produto, adicionais por
 * unidade e observação; o mesmo lanche com outro adicional conta como item novo.
 *
 * @example addedItems(antes.items, depois.items) // [1× Coca Cola 600ml]
 */
export function addedItems(
  before: OrderItem[],
  after: OrderItem[],
): OrderItem[] {
  const remaining = quantitiesByKey(before);
  return after.flatMap((item) => {
    const key = itemKey(item);
    const had = remaining.get(key) ?? 0;
    const kept = Math.min(had, item.quantity);
    remaining.set(key, had - kept);
    const extra = item.quantity - kept;
    return extra > 0 ? [withQuantity(item, extra)] : [];
  });
}
