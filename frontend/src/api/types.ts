export type UserRole = 'CAIXA' | 'ADMIN';

export interface SessionUser {
  id: number;
  name: string;
  role: UserRole;
}

export interface LoginResult {
  token: string;
  user: SessionUser;
}

export type OrderType = 'DELIVERY' | 'COUNTER';
export type ClosingStatus = 'OPEN' | 'CLOSED';

/** Dinheiro sempre como texto com 2 casas (`"25.50"`), igual ao backend: nunca somado no cliente. */
export type Money = string;

export interface PaymentMethod {
  id: number;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface DeliveryZone {
  id: number;
  neighborhood: string;
  neighborhoodKey: string;
  fee: Money;
  active: boolean;
}

export interface ExpenseType {
  id: number;
  name: string;
  nameKey: string;
  active: boolean;
}

export interface Order {
  id: number;
  amount: Money;
  /** Nulos só em pedidos importados da planilha histórica (sem essa informação). */
  type: OrderType | null;
  paymentMethodId: number | null;
  deliveryZoneId: number | null;
  deliveryFee: Money | null;
}

export interface OrderInput {
  amount: Money;
  type: OrderType;
  paymentMethodId: number;
  deliveryZoneId?: number;
  deliveryFee?: Money;
}

export interface Expense {
  id: number;
  expenseTypeId: number;
  description: string | null;
  amount: Money;
}

export interface ExpenseInput {
  expenseTypeId: number;
  description?: string;
  amount: Money;
}

export interface Closing {
  id: number;
  businessDate: string;
  status: ClosingStatus;
}

export interface PaymentMethodTotal {
  paymentMethodId: number;
  name: string;
  ordersCount: number;
  total: Money;
}

export interface ClosingReport {
  businessDate: string;
  status: ClosingStatus;
  orders: { count: number; total: Money };
  byPaymentMethod: PaymentMethodTotal[];
  withoutPaymentMethod: { count: number; total: Money };
  delivery: { count: number; feesTotal: Money };
  motoboy: { dailyRate: Money; deliveryFees: Money; totalCost: Money };
  expenses: { count: number; total: Money };
}

/** Intervalo inclusivo de datas `YYYY-MM-DD` (data local, sem fuso). */
export interface DateRange {
  from: string;
  to: string;
}

/** Totais do período: espelha `PeriodTotals` do backend (`dailyRates` = soma das diárias). */
export interface PeriodTotals {
  orders: ClosingReport['orders'];
  byPaymentMethod: PaymentMethodTotal[];
  withoutPaymentMethod: ClosingReport['withoutPaymentMethod'];
  delivery: ClosingReport['delivery'];
  motoboy: { dailyRates: Money; deliveryFees: Money; totalCost: Money };
  expenses: ClosingReport['expenses'];
}

/** Um relatório por dia com fechamento (ordem crescente) e o total do período. */
export interface PeriodReport extends DateRange {
  days: ClosingReport[];
  totals: PeriodTotals;
}

export type DayGroup = 'TUE_THU' | 'FRI_SUN';

/** Uma linha do histórico da diária: vale a partir de `effectiveFrom` até a próxima linha do mesmo grupo. */
export interface MotoboyRate {
  id: number;
  dayGroup: DayGroup;
  amount: Money;
  effectiveFrom: string;
  createdById: number;
}
