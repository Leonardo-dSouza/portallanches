export const REPORT_SOURCE = Symbol('REPORT_SOURCE');

export interface ReportOrderRow {
  amount: string;
  type: 'DELIVERY' | 'COUNTER';
  paymentMethodId: number;
  deliveryFee: string;
}

export interface ReportPaymentMethodRow {
  id: number;
  name: string;
  sortOrder: number;
}

/** Leituras que o relatório precisa; implementado sobre o Prisma. */
export interface ReportSource {
  listOrders(closingId: number): Promise<ReportOrderRow[]>;
  listExpenseAmounts(closingId: number): Promise<string[]>;
  listPaymentMethods(): Promise<ReportPaymentMethodRow[]>;
}
