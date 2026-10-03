import { shiftBusinessDate } from '../closing/business-date.js';
import { fromMilli, toMilli } from '../common/quantity.js';
import { sortByExpiry, type LotBalance } from './fefo.js';

/** Validade que vence em até 7 dias já aparece como alerta (decisão do usuário). */
export const EXPIRY_WARNING_DAYS = 7;

export type StockCountStatus = 'COUNTED' | 'NOT_COUNTED' | 'NEEDS_PURCHASE';

export interface LastCount {
  status: StockCountStatus;
  quantity: string | null;
  /** Instante ISO da contagem. */
  countedAt: string;
}

/** Tudo que o banco sabe de um insumo ativo, antes de calcular os alertas. */
export interface SupplySnapshot {
  supplyId: number;
  name: string;
  /** Seção do estoque; null = "Sem seção". */
  sectionId: number | null;
  countUnit: string;
  minStock: string | null;
  /** Só lotes com saldo. */
  lots: LotBalance[];
  lastCount: LastCount | null;
  /** Instante ISO da última entrada (lote novo); null se nunca entrou nada. */
  lastEntryAt: string | null;
}

export interface StockFlags {
  expired: boolean;
  expiringSoon: boolean;
  belowMin: boolean;
  needsPurchase: boolean;
}

export interface StockItem {
  supplyId: number;
  name: string;
  sectionId: number | null;
  countUnit: string;
  minStock: string | null;
  quantity: string;
  lots: { id: number; remaining: string; expiresOn: string | null }[];
  nextExpiry: string | null;
  lastCount: LastCount | null;
  flags: StockFlags;
}

/**
 * "Precisa comprar" vale até chegar uma entrada depois daquela contagem (a compra foi feita).
 */
function needsPurchase(snapshot: SupplySnapshot): boolean {
  const { lastCount, lastEntryAt } = snapshot;
  if (lastCount?.status !== 'NEEDS_PURCHASE') return false;
  return lastEntryAt === null || lastEntryAt < lastCount.countedAt;
}

function flagsOf(
  snapshot: SupplySnapshot,
  quantityMilli: number,
  nextExpiry: string | null,
  today: string,
): StockFlags {
  const warnUntil = shiftBusinessDate(today, EXPIRY_WARNING_DAYS);
  const { minStock } = snapshot;
  return {
    expired: nextExpiry !== null && nextExpiry < today,
    expiringSoon:
      nextExpiry !== null && nextExpiry >= today && nextExpiry <= warnUntil,
    belowMin: minStock !== null && quantityMilli < toMilli(minStock),
    needsPurchase: needsPurchase(snapshot),
  };
}

/**
 * Saldo, próxima validade e alertas de um insumo na data de negócio `today`.
 *
 * @example buildStockItem(snapshot, '2026-09-25').flags.expiringSoon
 */
export function buildStockItem(
  snapshot: SupplySnapshot,
  today: string,
): StockItem {
  const lots = sortByExpiry(snapshot.lots.filter((l) => l.remainingMilli > 0));
  const quantityMilli = lots.reduce((sum, l) => sum + l.remainingMilli, 0);
  const nextExpiry = lots.find((l) => l.expiresOn !== null)?.expiresOn ?? null;
  const { supplyId, name, sectionId, countUnit, minStock, lastCount } =
    snapshot;
  return {
    supplyId,
    name,
    sectionId,
    countUnit,
    minStock,
    quantity: fromMilli(quantityMilli),
    lots: lots.map((l) => ({
      id: l.id,
      remaining: fromMilli(l.remainingMilli),
      expiresOn: l.expiresOn,
    })),
    nextExpiry,
    lastCount,
    flags: flagsOf(snapshot, quantityMilli, nextExpiry, today),
  };
}
