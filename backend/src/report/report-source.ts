export const REPORT_SOURCE = Symbol('REPORT_SOURCE');

export interface ReportOrderRow {
  amount: string;
  /** Nulos apenas em pedidos importados da planilha histórica. */
  type: 'DELIVERY' | 'COUNTER' | null;
  paymentMethodId: number | null;
  deliveryFee: string | null;
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
