import type { OrderEventInput } from '../orders/order-events.js';
import type { OrderType, PaymentMode } from '../orders/order-input.js';

export const FIADO_REPOSITORY = Symbol('FIADO_REPOSITORY');

/**
 * Pedido fiado como as telas do fiado precisam (2026-10-25): a noite e o número dele, o valor,
 * o recebido (não estornado), a previsão e o cliente pelo cadastro atual.
 */
export interface FiadoOrderRecord {
  orderId: number;
  /** A noite do pedido. */
  businessDate: string;
  dayNumber: number;
  type: OrderType | null;
  amount: string;
  paid: string;
  canceled: boolean;
  dueDate: string | null;
  customerId: number;
  customerName: string;
  customerPhone: string | null;
}

/** Um recebimento de fiado, com o pedido que ele abate e a noite em que entrou na gaveta. */
export interface FiadoPaymentRecord {
  id: number;
  orderId: number;
  orderDayNumber: number;
  /** A noite do pedido (o "de 20/10" do comprovante). */
  orderBusinessDate: string;
  closingId: number;
  /** A noite em que o dinheiro entrou. */
  businessDate: string;
  amount: string;
  extra: string;
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
  createdAt: Date;
  canceledAt: Date | null;
  cancelReason: string | null;
}

/** Recebimento a gravar: o pedido, a noite da gaveta, os valores e quem recebeu. */
export interface NewFiadoPayment {
  orderId: number;
  closingId: number;
  amount: string;
  extra: string;
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
  createdById: number;
}

/** O estorno: quem, quando e o motivo. */
export interface FiadoPaymentCancel {
  userId: number;
  at: Date;
  reason: string;
}

/** Filtro das listas: de um cliente, ou com a previsão até a data (`dueBy`). */
export interface FiadoOrderFilter {
  customerId?: number;
  dueBy?: string;
}

export interface FiadoCustomerRecord {
  id: number;
  name: string;
  phone: string | null;
}

/**
 * Leituras e gravações do fiado. Toda gravação leva o passo no histórico do pedido, na mesma
 * transação (recebido, estornado, previsão remarcada).
 */
export interface FiadoRepository {
  /** Pedidos fiado não cancelados (abertos e pagos), na ordem da noite e do número. */
  listOrders(filter: FiadoOrderFilter): Promise<FiadoOrderRecord[]>;
  /** O pedido, se a forma dele é fiado (cancelado ou não); null nos outros. */
  findOrder(orderId: number): Promise<FiadoOrderRecord | null>;
  findCustomer(id: number): Promise<FiadoCustomerRecord | null>;
  /** Os recebimentos dos pedidos do cliente, os estornados também, o mais novo primeiro. */
  listPayments(customerId: number): Promise<FiadoPaymentRecord[]>;
  findPayment(id: number): Promise<FiadoPaymentRecord | null>;
  /** Grava o recebimento e o passo `FIADO_PAYMENT` do pedido (quem recebeu é o autor). */
  createPayment(data: NewFiadoPayment): Promise<FiadoPaymentRecord>;
  /** Null quando o recebimento já estava estornado (outro clique chegou antes). */
  cancelPayment(
    id: number,
    cancel: FiadoPaymentCancel,
    event: OrderEventInput,
  ): Promise<FiadoPaymentRecord | null>;
  setDueDate(
    orderId: number,
    dueDate: string | null,
    event: OrderEventInput,
  ): Promise<void>;
}
