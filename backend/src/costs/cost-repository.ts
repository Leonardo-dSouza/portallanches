import type {
  CostChanges,
  CostSnapshot,
  SupplyCostChange,
} from './cost-types.js';

export const COST_REPOSITORY = Symbol('COST_REPOSITORY');

/** Dados necessários para persistir um lote de alterações de custos. */
export interface CostApplyInput {
  after: CostSnapshot;
  changes: CostChanges;
  supplyChanges: SupplyCostChange[];
  summary: string;
  basedOnChangeSetId: number | null;
  userId: number;
  today: string;
}

/** Linha do histórico de custos e preços base de um insumo. */
export interface CostHistoryRow {
  createdAt: string;
  userName: string;
  oldUnitCost: string | null;
  newUnitCost: string | null;
  oldBasePrice: string | null;
  newBasePrice: string | null;
  baseQuantity: string | null;
  baseLabel: string | null;
}

/** Contrato de persistência e leitura para a área de custos da lanchonete. */
export interface CostRepository {
  loadSnapshot(): Promise<CostSnapshot>;
  apply(input: CostApplyInput): Promise<number>;
  history(supplyId: number): Promise<CostHistoryRow[]>;
}
