import type { ApiClient } from './api-client';
import type { Supply, SupplyInput } from './types';

/** Insumos do estoque: lista para qualquer logado; criar e editar só o admin. */
export interface SupplyApi {
  listSupplies(): Promise<Supply[]>;
  saveSupply(id: number | null, input: SupplyInput): Promise<Supply>;
}

/** @example const supplies = await createSupplyApi(api).listSupplies(); */
export function createSupplyApi(api: ApiClient): SupplyApi {
  return {
    listSupplies: () => api.request('GET', '/supplies'),
    saveSupply: (id, input) =>
      id === null
        ? api.request('POST', '/supplies', input)
        : api.request('PUT', `/supplies/${id}`, input),
  };
}
