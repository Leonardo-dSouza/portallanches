/** Ponto histórico da alteração do custo unitário de um insumo. */
export interface UnitCostHistoryPoint {
  createdAt: Date;
  oldUnitCost: string | null;
  newUnitCost: string | null;
}

/** Ordena os registros de histórico em ordem cronológica crescente. */
function sortByDateAsc(
  history: UnitCostHistoryPoint[],
): UnitCostHistoryPoint[] {
  return [...history].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

/**
 * Determina o custo unitário base de um insumo na data da emissão da nota fiscal.
 * Nota antes do 1º registro usa `oldUnitCost` dele; entre ou após registros usa
 * o `newUnitCost` do registro mais recente até a data; sem histórico usa o atual.
 *
 * @example baseUnitCostOn(history, '1.8000', new Date('2026-10-05')) // '1.2000'
 */
export function baseUnitCostOn(
  history: UnitCostHistoryPoint[],
  currentUnitCost: string | null,
  at: Date,
): string | null {
  if (history.length === 0) return currentUnitCost;
  const sorted = sortByDateAsc(history);
  const targetTime = at.getTime();
  if (targetTime < sorted[0].createdAt.getTime()) {
    return sorted[0].oldUnitCost;
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].createdAt.getTime() <= targetTime) {
      return sorted[i].newUnitCost;
    }
  }
  return currentUnitCost;
}
