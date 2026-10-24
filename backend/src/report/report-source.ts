import type { PaymentMode } from '../orders/order-input.js';
import type { ConsumptionCost } from '../staff-consumption/consumption-cost.js';

export const REPORT_SOURCE = Symbol('REPORT_SOURCE');

export interface ReportOrderRow {
  amount: string;
  /** Nulos apenas em pedidos importados da planilha histórica. */
  type: 'DELIVERY' | 'COUNTER' | null;
  paymentMethodId: number | null;
  paymentMode: PaymentMode | null;
  deliveryFee: string | null;
  /**
   * Cancelado (2026-10-15): fora dos totais, contado à parte. Ausente = não cancelado (as
   * leituras de período e da Análise já filtram no banco).
   */
  canceled?: boolean;
}

export interface ReportPaymentMethodRow {
  id: number;
  name: string;
  sortOrder: number;
  isCardTerminal: boolean;
}

/** Leituras que o relatório precisa; implementado sobre o Prisma. */
export interface ReportSource {
  listOrders(closingId: number): Promise<ReportOrderRow[]>;
  listExpenseAmounts(closingId: number): Promise<string[]>;
  listPaymentMethods(): Promise<ReportPaymentMethodRow[]>;
  /** Custo (CMV da época) de cada consumo interno do dia. */
  listStaffConsumptionCosts(closingId: number): Promise<ConsumptionCost[]>;
}
