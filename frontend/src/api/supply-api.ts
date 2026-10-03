import type { ApiClient } from './api-client';
import type { Supply, SupplyInput, SupplySection } from './types';

/** Insumos do estoque: lista para qualquer logado; criar e editar só o admin. */
export interface SupplyApi {
  listSupplies(): Promise<Supply[]>;
  listSections(): Promise<SupplySection[]>;
  saveSupply(id: number | null, input: SupplyInput): Promise<Supply>;
}

/** @example const supplies = await createSupplyApi(api).listSupplies(); */
export function createSupplyApi(api: ApiClient): SupplyApi {
  return {
    listSupplies: () => api.request('GET', '/supplies'),
    listSections: () => api.request('GET', '/supplies/sections'),
    saveSupply: (id, input) =>
      id === null
        ? api.request('POST', '/supplies', input)
        : api.request('PUT', `/supplies/${id}`, input),
  };
}
