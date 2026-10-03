import type { ReversalCandidate } from './entry-reversal.js';
import type { CountPlan, LotBalance } from './fefo.js';
import type { StockCountItemInput } from './stock-input.js';
import type { SupplySnapshot } from './stock-status.js';

export const STOCK_REPOSITORY = Symbol('STOCK_REPOSITORY');

export interface EntrySupply {
  id: number;
  name: string;
  active: boolean;
  packages: { name: string; quantity: string }[];
}

export interface NewLot {
  supplyId: number;
  /** Já convertida para a unidade de contagem. */
  quantity: string;
  expiresOn: string | null;
  createdById: number;
  /** R$ por unidade de contagem pago nesta entrada; também vira o custo do insumo. */
  unitCost: string | null;
}

export interface LotRecord extends NewLot {
  id: number;
}

/** Entrada lançada, para o histórico da aba Entrada. */
export interface EntryRecord {
  lotId: number;
  supplyId: number;
  supplyName: string;
  countUnit: string;
  quantity: string;
  remaining: string;
  expiresOn: string | null;
  unitCost: string | null;
  createdByName: string;
  /** Instantes ISO. */
  createdAt: string;
  reversedAt: string | null;
  /** Pode ser desfeita agora (`isReversible`). */
  reversible: boolean;
}

/** Valida o lote lido dentro da transação do estorno; lança se não puder desfazer. */
export type ReversalCheck = (lot: ReversalCandidate) => void;

/** Calcula o ajuste de um insumo a partir dos lotes lidos dentro da mesma transação. */
export type CountPlanner = (
  lots: LotBalance[],
  countedMilli: number,
) => CountPlan;

export interface StockRepository {
  /** Insumos ativos com lotes de saldo positivo, última contagem e última entrada. */
  listSnapshots(): Promise<SupplySnapshot[]>;
  /** Os insumos pedidos que existem (ativos ou não), com as embalagens. */
  findEntrySupplies(ids: number[]): Promise<EntrySupply[]>;
  /** Ids (dentre os pedidos) de insumos que existem e estão ativos. */
  activeSupplyIds(ids: number[]): Promise<number[]>;
  /**
   * Compra inteira numa transação: um lote + movimento de entrada por item; o insumo com
   * custo informado passa a ter esse custo (o último da lista vence).
   */
  addLots(lots: NewLot[]): Promise<LotRecord[]>;
  /** Entradas lançadas desde `since`, mais recentes primeiro. */
  listEntries(since: Date): Promise<EntryRecord[]>;
  /** Estorna a entrada (saldo zero + movimento REVERSAL); false = lote não existe. */
  reverseLot(
    lotId: number,
    userId: number,
    check: ReversalCheck,
  ): Promise<boolean>;
  /** Grava a sessão de contagem numa transação (ajustes de lote, movimentos e resultados). */
  saveCounts(
    userId: number,
    items: StockCountItemInput[],
    planner: CountPlanner,
  ): Promise<void>;
}
