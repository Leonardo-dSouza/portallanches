import type { SupplyInput } from './supply-input.js';

export const SUPPLY_REPOSITORY = Symbol('SUPPLY_REPOSITORY');

export interface SupplyRecord extends SupplyInput {
  id: number;
}

/** Insumo pronto para gravar: a chave de unicidade do nome já calculada. */
export interface SupplyData extends SupplyInput {
  nameKey: string;
}

export interface SupplyRepository {
  list(): Promise<SupplyRecord[]>;
  exists(id: number): Promise<boolean>;
  create(data: SupplyData): Promise<SupplyRecord>;
  /** Substitui os dados e a lista inteira de embalagens (lotes guardam quantidades já convertidas). */
  update(id: number, data: SupplyData): Promise<SupplyRecord>;
}
