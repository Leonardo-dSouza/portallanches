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

/** `?date=` só quando o usuário escolheu uma data; sem ela o servidor usa "hoje". */
function withDate(path: string, date: string | null): string {
  return date === null ? path : `${path}?date=${date}`;
}

/**
 * @param date data escolhida (`YYYY-MM-DD`) ou `null` para o "hoje" do servidor.
 * @example const cash = createCashApi(api, '2026-09-20'); const orders = await cash.listOrders();
 */
export function createCashApi(
  api: ApiClient,
  date: string | null = null,
): CashApi {
  const save = <T>(base: string, id: number | null, body: unknown) =>
    id === null
      ? api.request<T>('POST', withDate(base, date), body)
      : api.request<T>('PUT', `${base}/${id}`, body);
  return {
    closingToday: () => api.request('GET', withDate('/closings/today', date)),
    closeToday: () =>
      api.request('POST', withDate('/closings/today/close', date)),
    reportToday: () =>
      api.request('GET', withDate('/closings/today/report', date)),
    listOrders: () => api.request('GET', withDate('/orders/today', date)),
    saveOrder: (id, input) => save('/orders', id, input),
    deleteOrder: (id) => api.request('DELETE', `/orders/${id}`),
    listExpenses: () => api.request('GET', withDate('/expenses/today', date)),
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
