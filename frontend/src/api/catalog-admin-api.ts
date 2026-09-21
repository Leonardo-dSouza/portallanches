import type { ApiClient } from './api-client';
import type { DeliveryZone, ExpenseType } from './types';

export interface ZoneUpdate {
  neighborhood: string;
  fee: string;
  active: boolean;
}

export interface ExpenseTypeUpdate {
  name: string;
  active: boolean;
}

/** Edição de cadastros (só admin). Listas e criação ficam no `CashApi`, que o caixa também usa. */
export interface CatalogAdminApi {
  updateDeliveryZone(id: number, input: ZoneUpdate): Promise<DeliveryZone>;
  updateExpenseType(id: number, input: ExpenseTypeUpdate): Promise<ExpenseType>;
}

/** @example await createCatalogAdminApi(api).updateExpenseType(4, { name: 'Embalagens', active: false }); */
export function createCatalogAdminApi(api: ApiClient): CatalogAdminApi {
  return {
    updateDeliveryZone: (id, input) =>
      api.request('PUT', `/delivery-zones/${id}`, input),
    updateExpenseType: (id, input) =>
      api.request('PUT', `/expense-types/${id}`, input),
  };
}
