import { UnprocessableEntityException } from '@nestjs/common';
import type { OrderItemInput } from './order-item-input.js';
import type { OrderEntry, SaleProduct } from './order-pricing.js';

const pairKey = (productId: number, supplyId: number) =>
  `${productId}:${supplyId}`;

/** Retiradas que já estavam no pedido (a receita pode ter mudado depois). */
function keptPairs(previous: OrderEntry[]): Set<string> {
  return new Set(
    previous.flatMap((entry) =>
      entry.removals.map((r) => pairKey(entry.productId, r.supplyId)),
    ),
  );
}

function assertRemovalAllowed(product: SaleProduct, supplyId: number): void {
  if (product.menuNumber === null || product.isBundle)
    throw new UnprocessableEntityException(
      `"${product.name}" não é lanche: esperado item com número no cardápio para retirar ingrediente`,
    );
  if (product.removables.some((r) => r.supplyId === supplyId)) return;
  throw new UnprocessableEntityException(
    `Insumo ${supplyId} não sai de "${product.name}": esperado um ingrediente da composição, sem embalagem`,
  );
}

/**
 * Confere cada retirada contra o lanche. Produto que não existe fica para o preço (`sellable`).
 *
 * @example assertRemovalsAllowed(input.items, productsById, previousEntries)
 */
export function assertRemovalsAllowed(
  items: OrderItemInput[],
  products: Map<number, SaleProduct>,
  previous: OrderEntry[],
): void {
  const kept = keptPairs(previous);
  for (const item of items) {
    const product = products.get(item.productId);
    for (const supplyId of item.removedSupplyIds) {
      if (!product || kept.has(pairKey(item.productId, supplyId))) continue;
      assertRemovalAllowed(product, supplyId);
    }
  }
}
