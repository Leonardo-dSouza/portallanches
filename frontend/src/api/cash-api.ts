import type { ApiClient } from './api-client';
import type {
  Closing,
  ClosingReport,
  DeliveryZone,
  Expense,
  ExpenseInput,
  ExpenseType,
  Order,
  OrderInput,
  PaymentMethod,
} from './types';

/** Chamadas do caixa do dia, tipadas, sobre o `ApiClient` injetado. */
export interface CashApi {
  closingToday(): Promise<Closing>;
  closeToday(): Promise<Closing>;
  reportToday(): Promise<ClosingReport>;
  listOrders(): Promise<Order[]>;
  saveOrder(id: number | null, input: OrderInput): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  listExpenses(): Promise<Expense[]>;
  saveExpense(id: number | null, input: ExpenseInput): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;
  listPaymentMethods(): Promise<PaymentMethod[]>;
  listDeliveryZones(): Promise<DeliveryZone[]>;
  createDeliveryZone(neighborhood: string, fee: string): Promise<DeliveryZone>;
  listExpenseTypes(): Promise<ExpenseType[]>;
  createExpenseType(name: string): Promise<ExpenseType>;
}

/** @example const cash = createCashApi(api); const orders = await cash.listOrders(); */
export function createCashApi(api: ApiClient): CashApi {
  const save = <T>(base: string, id: number | null, body: unknown) =>
    id === null
      ? api.request<T>('POST', base, body)
      : api.request<T>('PUT', `${base}/${id}`, body);
  return {
    closingToday: () => api.request('GET', '/closings/today'),
    closeToday: () => api.request('POST', '/closings/today/close'),
    reportToday: () => api.request('GET', '/closings/today/report'),
    listOrders: () => api.request('GET', '/orders/today'),
    saveOrder: (id, input) => save('/orders', id, input),
    deleteOrder: (id) => api.request('DELETE', `/orders/${id}`),
    listExpenses: () => api.request('GET', '/expenses/today'),
    saveExpense: (id, input) => save('/expenses', id, input),
    deleteExpense: (id) => api.request('DELETE', `/expenses/${id}`),
    listPaymentMethods: () => api.request('GET', '/payment-methods'),
    listDeliveryZones: () => api.request('GET', '/delivery-zones'),
    createDeliveryZone: (neighborhood, fee) =>
      api.request('POST', '/delivery-zones', { neighborhood, fee }),
    listExpenseTypes: () => api.request('GET', '/expense-types'),
    createExpenseType: (name) =>
      api.request('POST', '/expense-types', { name }),
  };
}
