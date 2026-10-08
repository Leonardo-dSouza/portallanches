import type { ApiClient } from './api-client';
import type {
  ClosingReport,
  DeliveryZone,
  Expense,
  ExpenseType,
  Order,
  PaymentMethod,
} from './types';

/** Tudo do caixa de um dia, só para ler (rotas de admin por data) e os nomes dos cadastros. */
export interface DayClosing {
  orders: Order[];
  expenses: Expense[];
  report: ClosingReport;
  paymentMethods: PaymentMethod[];
  zones: DeliveryZone[];
  expenseTypes: ExpenseType[];
}

export interface DayClosingApi {
  /** 404 quando o dia não tem caixa. */
  load(date: string): Promise<DayClosing>;
}

/** @example const day = await createDayClosingApi(api).load('2026-09-25'); */
export function createDayClosingApi(api: ApiClient): DayClosingApi {
  const get = <T>(path: string) => api.request<T>('GET', path);
  return {
    load: async (date) => {
      const [orders, expenses, report, paymentMethods, zones, expenseTypes] =
        await Promise.all([
          get<Order[]>(`/closings/${date}/orders`),
          get<Expense[]>(`/closings/${date}/expenses`),
          get<ClosingReport>(`/closings/${date}/report`),
          get<PaymentMethod[]>('/payment-methods'),
          get<DeliveryZone[]>('/delivery-zones'),
          get<ExpenseType[]>('/expense-types'),
        ]);
      return { orders, expenses, report, paymentMethods, zones, expenseTypes };
    },
  };
}
