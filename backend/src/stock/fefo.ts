/** Saldo de um lote em milésimos da unidade de contagem. */
export interface LotBalance {
  id: number;
  remainingMilli: number;
  /** `YYYY-MM-DD`; null = sem validade (vai por último). */
  expiresOn: string | null;
}

export interface CountPlan {
  /** Quanto tirar de cada lote (milésimos, positivos), na ordem em que vencem. */
  takes: { lotId: number; milli: number }[];
  /** Sobra além do saldo do sistema: vira um lote sem validade ("ajuste de contagem"). */
  surplusMilli: number;
}

/**
 * Ordem FEFO (primeiro que vence, primeiro que sai): validade crescente, sem validade
 * por último e, empatando, o lote mais antigo primeiro.
 */
export function sortByExpiry<T extends LotBalance>(lots: readonly T[]): T[] {
  const key = (lot: LotBalance) => lot.expiresOn ?? '9999-12-31';
  return [...lots].sort((a, b) => key(a).localeCompare(key(b)) || a.id - b.id);
}

/**
 * Contagem por sobrescrita: o saldo passa a ser `countedMilli`. A diferença a menos sai
 * dos lotes que vencem primeiro; a diferença a mais vira sobra.
 *
 * @example planCount([{ id: 1, remainingMilli: 6000, expiresOn: '2026-09-30' }, { id: 2, remainingMilli: 6000, expiresOn: '2026-10-15' }], 8000)
 * // { takes: [{ lotId: 1, milli: 4000 }], surplusMilli: 0 }
 */
export function planCount(
  lots: readonly LotBalance[],
  countedMilli: number,
): CountPlan {
  const currentMilli = lots.reduce((sum, lot) => sum + lot.remainingMilli, 0);
  if (countedMilli >= currentMilli)
    return { takes: [], surplusMilli: countedMilli - currentMilli };
  let missing = currentMilli - countedMilli;
  const takes: CountPlan['takes'] = [];
  for (const lot of sortByExpiry(lots)) {
    const milli = Math.min(lot.remainingMilli, missing);
    if (milli > 0) takes.push({ lotId: lot.id, milli });
    missing -= milli;
  }
  return { takes, surplusMilli: 0 };
}
