import type { Money, OrderType, PaymentMode } from './types';

/**
 * O bloco `fiado` de todo pedido na forma fiado (2026-10-25): a previsão, o recebido, o que falta
 * e quanto o cliente deve em todos os fiados; null nas outras formas.
 */
export interface OrderFiado {
  /** "Pagar em" (`AAAA-MM-DD`); null = sem data. */
  dueDate: string | null;
  paidTotal: Money;
  remaining: Money;
  customerOpenTotal: Money;
}

/** Um pedido fiado nas listas: a noite e o número, o valor, o recebido, o que falta e a previsão. */
export interface FiadoOrderView {
  orderId: number;
  /** A noite do pedido. */
  businessDate: string;
  dayNumber: number;
  type: OrderType | null;
  amount: Money;
  paidTotal: Money;
  remaining: Money;
  dueDate: string | null;
}

/** Quem deve (`GET /fiado/open`): o cliente pelo cadastro atual e os pedidos que faltam pagar. */
export interface FiadoDebtor {
  customerId: number;
  name: string;
  phone: string | null;
  openTotal: Money;
  orders: FiadoOrderView[];
}

/** Fiado de outra noite a cobrar nesta (`GET /fiado/due`): o pedido com o cliente. */
export interface FiadoDueOrder extends FiadoOrderView {
  customerId: number;
  customerName: string;
  customerPhone: string | null;
}

/** Um recebimento de fiado (os estornados também vêm, com `canceledAt`). */
export interface FiadoPayment {
  id: number;
  orderId: number;
  orderDayNumber: number;
  /** A noite do pedido (o "de 20/10" do comprovante). */
  orderBusinessDate: string;
  closingId: number;
  /** A noite em que o dinheiro entrou na gaveta. */
  businessDate: string;
  amount: Money;
  /** Adicional (juros), fora das vendas; '0.00' sem adicional. */
  extra: Money;
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
  /** Instantes ISO. */
  createdAt: string;
  canceledAt: string | null;
  cancelReason: string | null;
}

export interface FiadoCustomer {
  id: number;
  name: string;
  phone: string | null;
}

/** O extrato do cliente (`GET /fiado/customers/:id`). */
export interface FiadoStatement {
  customer: FiadoCustomer;
  openTotal: Money;
  openOrders: FiadoOrderView[];
  paidOrders: FiadoOrderView[];
  payments: FiadoPayment[];
}

/** Resposta do Receber e do Estornar: o recebimento e os saldos depois do passo (comprovante). */
export interface FiadoReceipt {
  payment: FiadoPayment;
  customerId: number;
  customerName: string;
  /** O que falta no pedido depois deste passo. */
  remaining: Money;
  customerOpenTotal: Money;
}

/** Corpo do Receber: de 0,01 até o que falta; a forma não pode ser a fiado. */
export interface FiadoPaymentInput {
  amount: Money;
  /** Adicional (juros) em R$; ausente = sem adicional. */
  extra?: Money;
  paymentMethodId: number;
  /** Só na maquininha. */
  paymentMode?: PaymentMode;
}
