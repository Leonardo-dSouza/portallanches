import {
  DEFAULT_BUSINESS_TIMEZONE,
  shiftBusinessDate,
  toBusinessDate,
} from '../closing/business-date.js';
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
  /** "Contar todo dia" (alface, tomate...): fica pendente até a contagem de hoje. */
  dailyCount: boolean;
  /** Só lotes com saldo. */
  lots: LotBalance[];
  lastCount: LastCount | null;
  /** Instante ISO da última entrada (lote novo); null se nunca entrou nada. */
  lastEntryAt: string | null;
  /** Vendido além do saldo e ainda não coberto por entrada ou contagem (milésimos). */
  oversoldMilli: number;
}

export interface StockFlags {
  expired: boolean;
  expiringSoon: boolean;
  belowMin: boolean;
  needsPurchase: boolean;
  /** Insumo diário ainda sem contagem hoje ("Contar hoje" na Situação). */
  countDue: boolean;
  /** Vendeu além do saldo do sistema: "Conferir" até a próxima entrada ou contagem. */
  oversold: boolean;
}

export interface StockItem {
  supplyId: number;
  name: string;
  sectionId: number | null;
  countUnit: string;
  minStock: string | null;
  dailyCount: boolean;
  quantity: string;
  lots: { id: number; remaining: string; expiresOn: string | null }[];
  nextExpiry: string | null;
  lastCount: LastCount | null;
  /** Quanto foi vendido além do saldo (unidade de contagem); null = nada. */
  oversold: string | null;
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

/**
 * Diário pendente: sem contagem na data de negócio de hoje. "Não contado" é uma marcação,
 * não uma contagem, então não tira a pendência; "Precisa comprar" tira (alguém olhou).
 */
function countDue(snapshot: SupplySnapshot, today: string, timeZone: string) {
  const { dailyCount, lastCount } = snapshot;
  if (!dailyCount) return false;
  if (lastCount === null || lastCount.status === 'NOT_COUNTED') return true;
  return toBusinessDate(new Date(lastCount.countedAt), timeZone) < today;
}

interface StockDay {
  /** Data de negócio `YYYY-MM-DD`. */
  today: string;
  timeZone: string;
}

function flagsOf(
  snapshot: SupplySnapshot,
  quantityMilli: number,
  nextExpiry: string | null,
  { today, timeZone }: StockDay,
): StockFlags {
  const warnUntil = shiftBusinessDate(today, EXPIRY_WARNING_DAYS);
  const { minStock } = snapshot;
  return {
    expired: nextExpiry !== null && nextExpiry < today,
    expiringSoon:
      nextExpiry !== null && nextExpiry >= today && nextExpiry <= warnUntil,
    belowMin: minStock !== null && quantityMilli < toMilli(minStock),
    needsPurchase: needsPurchase(snapshot),
    countDue: countDue(snapshot, today, timeZone),
    oversold: snapshot.oversoldMilli > 0,
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
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
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
    dailyCount: snapshot.dailyCount,
    quantity: fromMilli(quantityMilli),
    lots: lots.map((l) => ({
      id: l.id,
      remaining: fromMilli(l.remainingMilli),
      expiresOn: l.expiresOn,
    })),
    nextExpiry,
    lastCount,
    oversold:
      snapshot.oversoldMilli > 0 ? fromMilli(snapshot.oversoldMilli) : null,
    flags: flagsOf(snapshot, quantityMilli, nextExpiry, { today, timeZone }),
  };
}
