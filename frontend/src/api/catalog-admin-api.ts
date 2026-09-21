import type { ApiClient } from './api-client';
import type {
  DayGroup,
  DeliveryZone,
  ExpenseType,
  MotoboyRate,
  PaymentMethod,
} from './types';

export interface ZoneUpdate {
  neighborhood: string;
  fee: string;
  active: boolean;
}

export interface ExpenseTypeUpdate {
  name: string;
  active: boolean;
}

export interface PaymentMethodInput {
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface MotoboyRateInput {
  dayGroup: DayGroup;
  amount: string;
  effectiveFrom: string;
}

/** Edição de cadastros (só admin). Listas e criação ficam no `CashApi`, que o caixa também usa. */
export interface CatalogAdminApi {
  updateDeliveryZone(id: number, input: ZoneUpdate): Promise<DeliveryZone>;
  updateExpenseType(id: number, input: ExpenseTypeUpdate): Promise<ExpenseType>;
  createPaymentMethod(input: PaymentMethodInput): Promise<PaymentMethod>;
  updatePaymentMethod(
    id: number,
    input: PaymentMethodInput,
  ): Promise<PaymentMethod>;
  listMotoboyRates(): Promise<MotoboyRate[]>;
  /** Mesmo grupo e mesma data corrige o valor daquela linha (não cria outra). */
  saveMotoboyRate(input: MotoboyRateInput): Promise<MotoboyRate>;
}

/** @example await createCatalogAdminApi(api).updateExpenseType(4, { name: 'Embalagens', active: false }); */
export function createCatalogAdminApi(api: ApiClient): CatalogAdminApi {
  return {
    updateDeliveryZone: (id, input) =>
      api.request('PUT', `/delivery-zones/${id}`, input),
    updateExpenseType: (id, input) =>
      api.request('PUT', `/expense-types/${id}`, input),
    createPaymentMethod: (input) =>
      api.request('POST', '/payment-methods', input),
    updatePaymentMethod: (id, input) =>
      api.request('PUT', `/payment-methods/${id}`, input),
    listMotoboyRates: () => api.request('GET', '/motoboy-rates'),
    saveMotoboyRate: (input) => api.request('POST', '/motoboy-rates', input),
  };
}
