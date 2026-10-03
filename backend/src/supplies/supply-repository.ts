import type { SaleProductRecord } from './sale-product.js';
import type { SupplyInput } from './supply-input.js';

export const SUPPLY_REPOSITORY = Symbol('SUPPLY_REPOSITORY');

export interface SupplySectionRecord {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface SupplyRecord extends Omit<SupplyInput, 'salePrice'> {
  id: number;
  /** Produto 1:1 do Cardápio (bebida); null = insumo que não se vende sozinho. */
  saleProduct: SaleProductRecord | null;
}

/** Insumo pronto para gravar: a chave de unicidade do nome já calculada. */
export interface SupplyData extends SupplyInput {
  nameKey: string;
}

export interface SupplyRepository {
  /** Na ordem da prateleira (`sortOrder`). */
  listSections(): Promise<SupplySectionRecord[]>;
  sectionExists(sectionId: number): Promise<boolean>;
  list(): Promise<SupplyRecord[]>;
  exists(id: number): Promise<boolean>;
  findSaleProduct(id: number): Promise<SaleProductRecord | null>;
  create(data: SupplyData): Promise<SupplyRecord>;
  /**
   * Substitui os dados e a lista inteira de embalagens (lotes guardam quantidades já
   * convertidas); com `salePrice` definido, grava o preço no produto 1:1 na mesma transação.
   */
  update(id: number, data: SupplyData): Promise<SupplyRecord>;
}
