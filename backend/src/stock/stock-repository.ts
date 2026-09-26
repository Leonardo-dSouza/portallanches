import type { CountPlan, LotBalance } from './fefo.js';
import type { StockCountItemInput } from './stock-input.js';
import type { SupplySnapshot } from './stock-status.js';

export const STOCK_REPOSITORY = Symbol('STOCK_REPOSITORY');

export interface EntrySupply {
  id: number;
  active: boolean;
  packages: { name: string; quantity: string }[];
}

export interface NewLot {
  supplyId: number;
  /** Já convertida para a unidade de contagem. */
  quantity: string;
  expiresOn: string | null;
  createdById: number;
}

export interface LotRecord extends NewLot {
  id: number;
}

/** Calcula o ajuste de um insumo a partir dos lotes lidos dentro da mesma transação. */
export type CountPlanner = (
  lots: LotBalance[],
  countedMilli: number,
) => CountPlan;

export interface StockRepository {
  /** Insumos ativos com lotes de saldo positivo, última contagem e última entrada. */
  listSnapshots(): Promise<SupplySnapshot[]>;
  findEntrySupply(id: number): Promise<EntrySupply | null>;
  /** Ids (dentre os pedidos) de insumos que existem e estão ativos. */
  activeSupplyIds(ids: number[]): Promise<number[]>;
  /** Lote novo + movimento de entrada. */
  addLot(lot: NewLot): Promise<LotRecord>;
  /** Grava a sessão de contagem numa transação (ajustes de lote, movimentos e resultados). */
  saveCounts(
    userId: number,
    items: StockCountItemInput[],
    planner: CountPlanner,
  ): Promise<void>;
}
