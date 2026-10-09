import type { ApiClient } from './api-client';
import type {
  Closing,
  ClosingReport,
  Customer,
  CustomerInput,
  DeliveryZone,
  Expense,
  ExpenseInput,
  ExpenseType,
  Order,
  OrderInput,
  PaymentMethod,
  SaleMenuItem,
  StreetZoneCount,
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
  findCustomersByPhone(phone: string): Promise<Customer[]>;
  /** Sem telefone: clientes com o mesmo nome (sem acento e maiúsculas); homônimos vêm todos. */
  findCustomersByName(name: string): Promise<Customer[]>;
  saveCustomer(id: number | null, input: CustomerInput): Promise<Customer>;
  listStreets(deliveryZoneId: number | null): Promise<string[]>;
  /** Clientes por rua e bairro: o bairro de um cliente novo vem da rua. */
  listStreetZones(): Promise<StreetZoneCount[]>;
  listExpenseTypes(): Promise<ExpenseType[]>;
  /** Cardápio inteiro (o caixa filtra ativo e com preço para a comanda). */
  /** Cardápio do dia do caixa, com o preço daquele dia. */
  listMenu(): Promise<SaleMenuItem[]>;
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
    listMenu: () => api.request('GET', withDate('/products/for-sale', date)),
    listDeliveryZones: () => api.request('GET', '/delivery-zones'),
    createDeliveryZone: (neighborhood, fee) =>
      api.request('POST', '/delivery-zones', { neighborhood, fee }),
    findCustomersByPhone: (phone) =>
      api.request('GET', `/customers?phone=${encodeURIComponent(phone)}`),
    findCustomersByName: (name) =>
      api.request('GET', `/customers?name=${encodeURIComponent(name)}`),
    saveCustomer: (id, input) =>
      id === null
        ? api.request('POST', '/customers', input)
        : api.request('PUT', `/customers/${id}`, input),
    listStreets: (deliveryZoneId) =>
      api.request(
        'GET',
        deliveryZoneId === null
          ? '/customers/streets'
          : `/customers/streets?deliveryZoneId=${deliveryZoneId}`,
      ),
    listStreetZones: () => api.request('GET', '/customers/street-zones'),
    listExpenseTypes: () => api.request('GET', '/expense-types'),
    createExpenseType: (name) =>
      api.request('POST', '/expense-types', { name }),
  };
}
