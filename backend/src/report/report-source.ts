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
  /** Fiado (2026-10-25): o pedido nesta forma fica fora do faturamento até ser pago. */
  isFiado: boolean;
}

/** Recebimento de fiado (não estornado): entra no faturamento da noite dele (2026-11-01). */
export interface ReportFiadoPaymentRow {
  amount: string;
  /** Adicional (juros): soma na forma e no faturamento. */
  extra: string;
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
}

/** O recebimento com quem pagou, para o quadro da noite (2026-11-01). */
export interface ReportFiadoReceiptRow extends ReportFiadoPaymentRow {
  orderDayNumber: number;
  /** A noite do pedido pago. */
  orderBusinessDate: string;
  customerName: string | null;
}

/** Fiado vendido na noite, com o que já foi pago em qualquer noite (2026-11-01). */
export interface ReportFiadoSoldRow {
  dayNumber: number;
  customerName: string | null;
  amount: string;
  /** Soma dos recebimentos não estornados. */
  paid: string;
  /** Última noite com recebimento não estornado; null sem nenhum. */
  lastPaidOn: string | null;
}

/** Leituras que o relatório precisa; implementado sobre o Prisma. */
export interface ReportSource {
  listOrders(closingId: number): Promise<ReportOrderRow[]>;
  listExpenseAmounts(closingId: number): Promise<string[]>;
  listPaymentMethods(): Promise<ReportPaymentMethodRow[]>;
  /** Custo (CMV da época) de cada consumo interno do dia. */
  listStaffConsumptionCosts(closingId: number): Promise<ConsumptionCost[]>;
  /** Recebimentos de fiado não estornados da noite, com quem pagou. */
  listFiadoPayments(closingId: number): Promise<ReportFiadoReceiptRow[]>;
  /** Fiados não cancelados vendidos na noite, na ordem do número do dia. */
  listFiadoSold(closingId: number): Promise<ReportFiadoSoldRow[]>;
}
