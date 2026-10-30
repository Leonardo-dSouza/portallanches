import { toMilli } from '../common/quantity.js';
import type { OrderLine, SaleProduct } from './order-pricing.js';
import type { StockChange } from './order-repository.js';

/** Quanto de um insumo o pedido tira do estoque, em milésimos da unidade de contagem. */
export interface SaleNeed {
  supplyId: number;
  milli: number;
}

/**
 * O que o pedido baixa: só os insumos com "Baixa" ligada (as bebidas), vezes a quantidade de
 * cada linha, somados por insumo, sem os ingredientes retirados da linha. Combo chega com os
 * insumos dos itens (`expandBundle`).
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
    const removed = new Set(line.removals.map((r) => r.supplyId));
    const taken = components.filter(
      (c) => c.deductOnSale && !removed.has(c.supplyId),
    );
    for (const c of taken) {
      const milli = toMilli(c.quantity) * line.quantity;
      bySupply.set(c.supplyId, (bySupply.get(c.supplyId) ?? 0) + milli);
    }
  }
  return [...bySupply].map(([supplyId, milli]) => ({ supplyId, milli }));
}

/**
 * Baixa no estoque só na noite em andamento; caixa atrasado não mexe (decisão de 2026-10-09).
 * `needs` vazio = só devolve o que o pedido tinha baixado (cancelar).
 *
 * @example stockChangeFor(true, 2, []) // { userId: 2, needs: [] }
 */
export function stockChangeFor(
  live: boolean,
  userId: number,
  needs: SaleNeed[],
): StockChange | null {
  return live ? { userId, needs } : null;
}
