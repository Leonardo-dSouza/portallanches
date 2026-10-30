import { assertAddonsAllowed } from './order-addons.js';
import { productIdsOf, type OrderItemInput } from './order-item-input.js';
import { flattenEntries } from './order-item-tree.js';
import { priceOrderEntries, type OrderEntry } from './order-pricing.js';
import type { OrderCatalog } from './order-repository.js';
import { sortItemsByCategory } from './item-order.js';
import { assertRemovalsAllowed } from './order-removals.js';
import { saleNeeds, type SaleNeed } from './stock-needs.js';

/** Linhas com preço e CMV da época e o que elas tiram do estoque. */
export interface PricedItems {
  items: OrderEntry[];
  needs: SaleNeed[];
}

/**
 * Linhas com o preço do dia e o que elas tiram do estoque (pela composição de hoje). Usado pelo
 * pedido e pelo consumo interno; `previous` = linhas em edição, que mantêm o preço gravado.
 *
 * @example await priceItemsForDay(catalog, [{ productId: 9, quantity: 1, note: null, addons: [], removedSupplyIds: [] }], '2026-09-22', [])
 */
export async function priceItemsForDay(
  catalog: Pick<OrderCatalog, 'findProductsForSale'>,
  input: OrderItemInput[],
  businessDate: string,
  previous: OrderEntry[],
): Promise<PricedItems> {
  const ids = productIdsOf(input);
  const products = await catalog.findProductsForSale(ids, businessDate);
  const byId = new Map(products.map((p) => [p.id, p]));
  assertAddonsAllowed(input, byId, previous);
  assertRemovalsAllowed(input, byId, previous);
  const sorted = sortItemsByCategory(input, byId);
  const items = priceOrderEntries(sorted, byId, previous);
  return { items, needs: saleNeeds(flattenEntries(items), byId) };
}
