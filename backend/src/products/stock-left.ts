/** Insumo com baixa de um item do cardápio e quanto vai em uma unidade do item (milésimos). */
export interface StockComponent {
  supplyId: number;
  milli: number;
}

/**
 * Quantas unidades do item o saldo do sistema ainda cobre: o insumo com baixa que acaba primeiro
 * manda (combo: os dos itens). Null = o item não tem insumo com baixa (lanches, açaí).
 *
 * @example stockLeftOf([{ supplyId: 30, milli: 1000 }], new Map([[30, 5000]])) // 5
 */
export function stockLeftOf(
  components: StockComponent[],
  balances: ReadonlyMap<number, number>,
): number | null {
  if (components.length === 0) return null;
  const units = components.map((c) =>
    Math.floor((balances.get(c.supplyId) ?? 0) / c.milli),
  );
  return Math.min(...units);
}
