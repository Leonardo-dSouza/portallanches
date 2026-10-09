import { toMilli } from '../common/quantity.js';
import type { OrderLine, SaleProduct } from './order-pricing.js';

/** Quanto de um insumo o pedido tira do estoque, em milésimos da unidade de contagem. */
export interface SaleNeed {
  supplyId: number;
  milli: number;
}

/**
 * O que o pedido baixa: só os insumos com "Baixa" ligada (as bebidas), vezes a quantidade de
 * cada linha, somados por insumo. Combo chega com os insumos dos itens (`expandBundle`).
 *
 * @example saleNeeds([{ productId: 60, quantity: 3, ... }], products) // [{ supplyId: 30, milli: 3000 }]
 */
export function saleNeeds(
  lines: OrderLine[],
  products: ReadonlyMap<number, SaleProduct>,
): SaleNeed[] {
  const bySupply = new Map<number, number>();
  for (const line of lines) {
    const components = products.get(line.productId)?.components ?? [];
    for (const c of components.filter((c) => c.deductOnSale)) {
      const milli = toMilli(c.quantity) * line.quantity;
      bySupply.set(c.supplyId, (bySupply.get(c.supplyId) ?? 0) + milli);
    }
  }
  return [...bySupply].map(([supplyId, milli]) => ({ supplyId, milli }));
}
