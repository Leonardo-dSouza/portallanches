import type { UserRole } from '../auth/session-user.js';
import type { PaymentMode } from './order-input.js';
import type { OrderEntry } from './order-pricing.js';
import type { OrderStatus } from './order-status.js';

/** O pedido num instante, para o histórico: valor, forma e os itens em texto. */
export interface OrderSnapshot {
  amount: string;
  /** Null = "A pagar" (conta aberta). A tela põe o nome da forma. */
  paymentMethodId: number | null;
  paymentMode: PaymentMode | null;
  items: string;
}

/** Um recebimento de fiado no histórico do pedido (2026-10-25): quanto, como e em que noite. */
export interface FiadoPaymentSnapshot {
  paymentId: number;
  amount: string;
  extra: string;
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
  /** A noite em que entrou na gaveta. */
  businessDate: string;
}

/** O que cada passo do histórico guarda (2026-10-15: "estamos mexendo com dinheiro"). */
export type OrderEventDetails =
  | { kind: 'CREATED'; order: OrderSnapshot }
  | { kind: 'EDITED'; before: OrderSnapshot; after: OrderSnapshot }
  | { kind: 'STATUS'; from: OrderStatus; to: OrderStatus }
  | { kind: 'CANCELED'; reason: string }
  | { kind: 'RESTORED' }
  | { kind: 'FIADO_PAYMENT'; payment: FiadoPaymentSnapshot }
  | {
      kind: 'FIADO_PAYMENT_CANCELED';
      payment: FiadoPaymentSnapshot;
      reason: string;
    }
  | { kind: 'FIADO_DUE_DATE'; from: string | null; to: string | null };

export type OrderEventKind = OrderEventDetails['kind'];

/** Um passo a gravar junto com a mudança do pedido, na mesma transação. */
export interface OrderEventInput {
  userId: number;
  /** A senha do admin liberou o que o caixa não faz sozinho. */
  managerAuthorized: boolean;
  details: OrderEventDetails;
}

/** Um passo lido do histórico: o login compartilhado diz só o perfil (decisão de 2026-10-15). */
export interface OrderEventRecord {
  id: number;
  at: Date;
  userRole: UserRole;
  managerAuthorized: boolean;
  details: OrderEventDetails;
}

function entryText(entry: OrderEntry): string {
  const extras = [
    ...entry.addons.map((addon) => `+${addon.quantity} ${addon.productName}`),
    ...entry.removals.map((removal) => `s/ ${removal.supplyName}`),
    ...(entry.note ? [entry.note] : []),
  ];
  const base = `${entry.quantity}× ${entry.productName}`;
  return extras.length > 0 ? `${base} (${extras.join(', ')})` : base;
}

/**
 * Os itens em uma linha, como o caixa lê: quantidade, nome e, entre parênteses, adicionais,
 * retiradas e observação.
 *
 * @example describeEntries(items) // '2× X Salada (+2 Add bacon, sem tomate), 1× Coca Cola 600ml'
 */
export function describeEntries(items: OrderEntry[]): string {
  return items.map(entryText).join(', ');
}

/**
 * O que o histórico guarda de um pedido (gravado ou prestes a gravar).
 *
 * @example snapshotOf(order).amount // '35.60'
 */
export function snapshotOf(order: {
  amount: string;
  paymentMethodId: number | null;
  paymentMode: PaymentMode | null;
  items: OrderEntry[];
}): OrderSnapshot {
  return {
    amount: order.amount,
    paymentMethodId: order.paymentMethodId,
    paymentMode: order.paymentMode,
    items: describeEntries(order.items),
  };
}
