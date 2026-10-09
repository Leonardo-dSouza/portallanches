import type { ProductInput } from './product-input.js';
import type { DatedMenuEntry } from './sale-menu.js';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductCategoryRecord {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
}

/** Componente lido com os dados do insumo que o CMV e a tela precisam. */
export interface ProductComponentRecord {
  supplyId: number;
  supplyName: string;
  countUnit: string;
  /** Custo atual do insumo por unidade de contagem; null = sem custo. */
  unitCost: string | null;
  quantity: string;
}

export interface ProductRecord extends Omit<ProductInput, 'components'> {
  id: number;
  categoryName: string;
  components: ProductComponentRecord[];
}

/** Produto pronto para gravar: a chave de unicidade do nome já calculada. */
export interface ProductData extends ProductInput {
  nameKey: string;
}

export interface ProductRepository {
  listCategories(): Promise<ProductCategoryRecord[]>;
  /** Ordenados por categoria (`sortOrder`), número do cardápio e nome. */
  list(): Promise<ProductRecord[]>;
  /**
   * Produtos que podiam vender no dia (ativos ou que saíram depois dele), na ordem do `list`,
   * com a linha do histórico de preço que valia no dia.
   */
  listDatedMenu(businessDate: string): Promise<DatedMenuEntry[]>;
  exists(id: number): Promise<boolean>;
  categoryExists(categoryId: number): Promise<boolean>;
  /** Dos ids pedidos, os que não existem na tabela de insumos. */
  missingSupplyIds(supplyIds: number[]): Promise<number[]>;
  create(data: ProductData): Promise<ProductRecord>;
  /**
   * Substitui os dados e a composição inteira. `today` (dia de negócio) data o histórico: o
   * preço antigo vale até ontem e o item desativado sai do cardápio hoje.
   */
  update(id: number, data: ProductData, today: string): Promise<ProductRecord>;
}
