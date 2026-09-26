import type { ApiClient } from './api-client';
import type { Product, ProductCategory, ProductInput } from './types';

/** Cardápio: leitura para qualquer logado; criar e editar só o admin. */
export interface ProductApi {
  listCategories(): Promise<ProductCategory[]>;
  listProducts(): Promise<Product[]>;
  saveProduct(id: number | null, input: ProductInput): Promise<Product>;
}

/** @example const products = await createProductApi(api).listProducts(); */
export function createProductApi(api: ApiClient): ProductApi {
  return {
    listCategories: () => api.request('GET', '/product-categories'),
    listProducts: () => api.request('GET', '/products'),
    saveProduct: (id, input) =>
      id === null
        ? api.request('POST', '/products', input)
        : api.request('PUT', `/products/${id}`, input),
  };
}
