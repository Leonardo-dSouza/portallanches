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
   * Cancelado (2026-10-15): fora dos totais, contado à parte com o número do dia e o motivo
   * (2026-10-27). Ausente = não cancelado (as leituras de período e da Análise já filtram no banco).
   */
  canceled?: { dayNumber: number; reason: string | null };
}

export interface ReportPaymentMethodRow {
  id: number;
  name: string;
  sortOrder: number;
  isCardTerminal: boolean;
  /** Fiado (2026-10-25): o total dela é o "a receber", fora da gaveta. */
  isFiado: boolean;
}

/** Recebimento de fiado (não estornado) que entrou na gaveta da noite (2026-10-25). */
export interface ReportFiadoPaymentRow {
  amount: string;
  /** Adicional (juros): soma na gaveta, fora das vendas. */
  extra: string;
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
}

/** Leituras que o relatório precisa; implementado sobre o Prisma. */
export interface ReportSource {
  listOrders(closingId: number): Promise<ReportOrderRow[]>;
  listExpenseAmounts(closingId: number): Promise<string[]>;
  listPaymentMethods(): Promise<ReportPaymentMethodRow[]>;
  /** Custo (CMV da época) de cada consumo interno do dia. */
  listStaffConsumptionCosts(closingId: number): Promise<ConsumptionCost[]>;
  /** Recebimentos de fiado não estornados que entraram na gaveta da noite. */
  listFiadoPayments(closingId: number): Promise<ReportFiadoPaymentRow[]>;
}
