import type { ProductInput } from './product-input.js';
import type { DatedMenuEntry } from './sale-menu.js';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

/** Componente lido com os dados do insumo que o CMV e a tela precisam. */
export interface ProductComponentRecord {
  supplyId: number;
  supplyName: string;
  countUnit: string;
  /** Custo atual do insumo por unidade de contagem; null = sem custo. */
  unitCost: string | null;
  quantity: string;
}

/** Item de um combo, com a composição dele para o CMV do combo. */
export interface BundleItemRecord {
  productId: number;
  productName: string;
  quantity: number;
  components: ProductComponentRecord[];
}

export interface ProductRecord extends Omit<
  ProductInput,
  'components' | 'bundleItems'
> {
  id: number;
  categoryName: string;
  components: ProductComponentRecord[];
  /** Vazio = produto comum. */
  bundleItems: BundleItemRecord[];
}

/** O que o banco diz sobre os itens pedidos para um combo. */
export interface BundleFacts {
  /** Ids que não existem em products. */
  missing: number[];
  /** Ids que já são combos (combo dentro de combo não vale). */
  combos: number[];
  /** O produto em edição já está dentro de algum combo (então não vira combo). */
  usedInCombo: boolean;
}

/** Produto pronto para gravar: a chave de unicidade do nome já calculada. */
export interface ProductData extends ProductInput {
  nameKey: string;
}

export interface ProductRepository {
  /** Ordenados por categoria (`sortOrder`), número do cardápio e nome. */
  list(): Promise<ProductRecord[]>;
  /**
   * Produtos que podiam vender no dia (ativos ou que saíram depois dele), na ordem do `list`,
   * com a linha do histórico de preço que valia no dia.
   */
  listDatedMenu(businessDate: string): Promise<DatedMenuEntry[]>;
  /** Saldo (soma dos lotes, em milésimos) dos insumos pedidos; sem lote = fora do mapa. */
  stockBalances(supplyIds: number[]): Promise<Map<number, number>>;
  exists(id: number): Promise<boolean>;
  categoryExists(categoryId: number): Promise<boolean>;
  /** Dos ids pedidos, os que não existem na tabela de insumos. */
  missingSupplyIds(supplyIds: number[]): Promise<number[]>;
  /** `productId` null = produto novo (não está em combo nenhum). */
  bundleFacts(
    productId: number | null,
    itemIds: number[],
  ): Promise<BundleFacts>;
  create(data: ProductData): Promise<ProductRecord>;
  /**
   * Substitui os dados e a composição inteira. `today` (dia de negócio) data o histórico: o
   * preço antigo vale até ontem e o item desativado sai do cardápio hoje.
   */
  update(id: number, data: ProductData, today: string): Promise<ProductRecord>;
}
