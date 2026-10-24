import type { ApiClient } from './api-client';
import type { StaffConsumption } from './staff-consumption-types';
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
  /** Consumo interno do dia (2026-10-23), à parte das vendas e dos gastos. */
  staffConsumptions: StaffConsumption[];
  report: ClosingReport;
  paymentMethods: PaymentMethod[];
  zones: DeliveryZone[];
  expenseTypes: ExpenseType[];
}

export interface DayClosingApi {
  /** 404 quando o dia não tem caixa. */
  load(date: string): Promise<DayClosing>;
}

type Get = <T>(path: string) => Promise<T>;

/** Os nomes dos cadastros que a visão do dia mostra (formas, bairros e tipos de gasto). */
async function loadCatalogs(get: Get) {
  const [paymentMethods, zones, expenseTypes] = await Promise.all([
    get<PaymentMethod[]>('/payment-methods'),
    get<DeliveryZone[]>('/delivery-zones'),
    get<ExpenseType[]>('/expense-types'),
  ]);
  return { paymentMethods, zones, expenseTypes };
}

/** @example const day = await createDayClosingApi(api).load('2026-09-25'); */
export function createDayClosingApi(api: ApiClient): DayClosingApi {
  const get = <T>(path: string) => api.request<T>('GET', path);
  return {
    load: async (date) => {
      const [orders, expenses, staffConsumptions, report, catalogs] =
        await Promise.all([
          get<Order[]>(`/closings/${date}/orders`),
          get<Expense[]>(`/closings/${date}/expenses`),
          get<StaffConsumption[]>(`/closings/${date}/staff-consumptions`),
          get<ClosingReport>(`/closings/${date}/report`),
          loadCatalogs(get),
        ]);
      return { orders, expenses, staffConsumptions, report, ...catalogs };
    },
  };
}
