import type { ApiClient } from './api-client';
import type {
  CategoryProductOrder,
  Product,
  ProductCategory,
  ProductInput,
} from './types';

/** Cardápio e categorias: leitura para qualquer logado; criar, editar e ordenar só o admin. */
export interface ProductApi {
  listCategories(): Promise<ProductCategory[]>;
  createCategory(name: string): Promise<ProductCategory>;
  updateCategory(
    id: number,
    next: { name: string; active: boolean },
  ): Promise<ProductCategory>;
  /** Todos os ids, na ordem nova. */
  reorderCategories(ids: number[]): Promise<ProductCategory[]>;
  /** De qual categoria vêm os adicionais dos itens desta (null = não aceita). */
  setAddonCategory(
    id: number,
    addonCategoryId: number | null,
  ): Promise<ProductCategory>;
  /** Escolha obrigatória dos itens desta (o pão do artesanal, 2026-11-08; null = sem escolha). */
  setChoiceCategory(
    id: number,
    choiceCategoryId: number | null,
  ): Promise<ProductCategory>;
  /** Produtos da categoria na ordem das teclas da escolha. */
  listProductOrder(categoryId: number): Promise<CategoryProductOrder[]>;
  /** Todos os produtos da categoria, na ordem nova das teclas. */
  reorderProducts(
    categoryId: number,
    ids: number[],
  ): Promise<CategoryProductOrder[]>;
  listProducts(): Promise<Product[]>;
  saveProduct(id: number | null, input: ProductInput): Promise<Product>;
}

/** @example const products = await createProductApi(api).listProducts(); */
export function createProductApi(api: ApiClient): ProductApi {
  return {
    listCategories: () => api.request('GET', '/product-categories'),
    createCategory: (name) =>
      api.request('POST', '/product-categories', { name }),
    updateCategory: (id, next) =>
      api.request('PUT', `/product-categories/${id}`, next),
    reorderCategories: (ids) =>
      api.request('PUT', '/product-categories/order', { ids }),
    setAddonCategory: (id, addonCategoryId) =>
      api.request('PUT', `/product-categories/${id}/addon-category`, {
        addonCategoryId,
      }),
    setChoiceCategory: (id, choiceCategoryId) =>
      api.request('PUT', `/product-categories/${id}/choice-category`, {
        choiceCategoryId,
      }),
    listProductOrder: (categoryId) =>
      api.request('GET', `/product-categories/${categoryId}/product-order`),
    reorderProducts: (categoryId, ids) =>
      api.request('PUT', `/product-categories/${categoryId}/product-order`, {
        ids,
      }),
    listProducts: () => api.request('GET', '/products'),
    saveProduct: (id, input) =>
      id === null
        ? api.request('POST', '/products', input)
        : api.request('PUT', `/products/${id}`, input),
  };
}
