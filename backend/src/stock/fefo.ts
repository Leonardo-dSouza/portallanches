/** Saldo de um lote em milésimos da unidade de contagem. */
export interface LotBalance {
  id: number;
  remainingMilli: number;
  /** `YYYY-MM-DD`; null = sem validade (vai por último). */
  expiresOn: string | null;
}

/** Quanto tirar de um lote (milésimos, positivo). */
export interface LotTake {
  lotId: number;
  milli: number;
}

export interface CountPlan {
  /** Quanto tirar de cada lote, na ordem em que vencem. */
  takes: LotTake[];
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
  const takes = takeInExpiryOrder(lots, currentMilli - countedMilli);
  return { takes, surplusMilli: 0 };
}

/** Tira `milli` dos lotes na ordem FEFO, até onde o saldo deles der. */
function takeInExpiryOrder(
  lots: readonly LotBalance[],
  milli: number,
): LotTake[] {
  let missing = milli;
  const takes: LotTake[] = [];
  for (const lot of sortByExpiry(lots)) {
    const taken = Math.min(lot.remainingMilli, missing);
    if (taken > 0) takes.push({ lotId: lot.id, milli: taken });
    missing -= taken;
  }
  return takes;
}

export interface SalePlan {
  takes: LotTake[];
  /** O que o saldo do sistema não cobriu (vira "Conferir" na Situação). */
  missingMilli: number;
}

/**
 * Baixa de uma venda: sai dos lotes que vencem primeiro. Sem saldo bastante no sistema (compra
 * não lançada), tira o que existe e diz quanto faltou; o saldo nunca fica negativo.
 *
 * @example planSale([{ id: 1, remainingMilli: 2000, expiresOn: null }], 5000) // { takes: [{ lotId: 1, milli: 2000 }], missingMilli: 3000 }
 */
export function planSale(
  lots: readonly LotBalance[],
  needMilli: number,
): SalePlan {
  const takes = takeInExpiryOrder(lots, needMilli);
  const taken = takes.reduce((sum, take) => sum + take.milli, 0);
  return { takes, missingMilli: needMilli - taken };
}
