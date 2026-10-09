/** Movimento de venda de um pedido (SALE negativo, SALE_RETURN positivo), em milésimos. */
export interface SaleMove {
  lotId: number;
  supplyId: number;
  milli: number;
}

/**
 * O que devolver a cada lote ao editar ou apagar um pedido: a soma do que as vendas dele tiraram
 * menos o que já voltou. Lote sem saldo a devolver fica de fora.
 *
 * @example netTakenByLot([{ lotId: 1, supplyId: 30, milli: -3000 }]) // [{ lotId: 1, supplyId: 30, milli: 3000 }]
 */
export function netTakenByLot(moves: SaleMove[]): SaleMove[] {
  const byLot = new Map<number, SaleMove>();
  for (const move of moves) {
    const found = byLot.get(move.lotId) ?? { ...move, milli: 0 };
    byLot.set(move.lotId, { ...found, milli: found.milli - move.milli });
  }
  return [...byLot.values()].filter((move) => move.milli > 0);
}
