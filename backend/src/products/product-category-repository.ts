export const PRODUCT_CATEGORY_REPOSITORY = Symbol(
  'PRODUCT_CATEGORY_REPOSITORY',
);

/** Categoria do cardápio como está no banco. */
export interface CategoryRecord {
  id: number;
  name: string;
  /** Nome normalizado (único); a importação acha a categoria por ele. */
  nameKey: string;
  sortOrder: number;
  active: boolean;
  /** Categoria de onde vêm os adicionais dos itens desta; null = não aceita adicionais. */
  addonCategoryId: number | null;
}

export type CategoryData = Omit<CategoryRecord, 'id' | 'addonCategoryId'>;

export interface ProductCategoryRepository {
  /** Na ordem do cardápio (`sortOrder`, depois nome). */
  list(): Promise<CategoryRecord[]>;
  findById(id: number): Promise<CategoryRecord | null>;
  /** Nome repetido vira 409 pela chave única. */
  create(data: CategoryData): Promise<CategoryRecord>;
  update(
    id: number,
    data: Omit<CategoryData, 'sortOrder'>,
  ): Promise<CategoryRecord>;
  setAddonCategory(
    id: number,
    addonCategoryId: number | null,
  ): Promise<CategoryRecord>;
  /** `sortOrder` = posição na lista (1, 2, 3…), numa transação. */
  reorder(ids: number[]): Promise<void>;
}
