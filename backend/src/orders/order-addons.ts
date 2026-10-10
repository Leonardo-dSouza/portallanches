import { UnprocessableEntityException } from '@nestjs/common';
import type { OrderItemInput } from './order-item-input.js';
import type { OrderEntry, SaleProduct } from './order-pricing.js';

const pairKey = (parentId: number, addonId: number) => `${parentId}:${addonId}`;

/** Pares item + adicional que já estavam no pedido (a configuração pode ter mudado depois). */
function keptPairs(previous: OrderEntry[]): Set<string> {
  return new Set(
    previous.flatMap((e) =>
      e.addons.map((a) => pairKey(e.productId, a.productId)),
    ),
  );
}

function assertAddonAllowed(parent: SaleProduct, addon: SaleProduct): void {
  if (addon.isBundle)
    throw new UnprocessableEntityException(
      `"${addon.name}" é combo e não entra como adicional de "${parent.name}"; esperado um item da categoria de adicionais`,
    );
  if (parent.addonCategoryId === null)
    throw new UnprocessableEntityException(
      `"${parent.name}" não aceita adicionais; esperado ligar os adicionais da categoria "${parent.categoryName}" em Cadastros → Categorias`,
    );
  if (addon.categoryId !== parent.addonCategoryId)
    throw new UnprocessableEntityException(
      `"${addon.name}" não é adicional de "${parent.name}"; esperado um item da categoria de adicionais de "${parent.categoryName}"`,
    );
}

/**
 * Confere cada adicional contra a categoria de adicionais do item (Cadastros → Categorias).
 * Produto que não existe ou sem preço fica para o preço (`sellable`), que já recusa.
 *
 * @example assertAddonsAllowed(input.items, productsById, previousEntries)
 */
export function assertAddonsAllowed(
  items: OrderItemInput[],
  products: Map<number, SaleProduct>,
  previous: OrderEntry[],
): void {
  const kept = keptPairs(previous);
  for (const item of items) {
    const parent = products.get(item.productId);
    for (const { productId } of item.addons) {
      const addon = products.get(productId);
      if (!parent || !addon || kept.has(pairKey(item.productId, productId)))
        continue;
      assertAddonAllowed(parent, addon);
    }
  }
}
