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
  type: OrderType;
  paymentMethodId: number;
  deliveryZoneId: number | null;
  deliveryFee: Money;
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
  delivery: { count: number; feesTotal: Money };
  motoboy: { dailyRate: Money; deliveryFees: Money; totalCost: Money };
  expenses: { count: number; total: Money };
}
