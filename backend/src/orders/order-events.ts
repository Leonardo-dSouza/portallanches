import type { UserRole } from '../auth/session-user.js';
import type { PaymentMode } from './order-input.js';
import type { OrderEntry } from './order-pricing.js';
import type { OrderStatus } from './order-status.js';
import { isSplitPayment, type PaymentPart } from './payment-parts.js';
import { removalLabels } from './removal-labels.js';

/** O pedido num instante, para o histórico: valor, forma e os itens em texto. */
export interface OrderSnapshot {
  amount: string;
  /** Null = "A pagar" (conta aberta). A tela põe o nome da forma. */
  paymentMethodId: number | null;
  paymentMode: PaymentMode | null;
  items: string;
  /** Partes do pagamento quando dividido (card 2, 2026-11-08); omitido quando uma forma só. */
  paymentParts?: PaymentPart[];
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
  /** A trava do caixa foi liberada (senha do admin até 2026-11-15, código do gerente depois). */
  managerAuthorized: boolean;
  /** O admin dono do código que liberou; ausente ou null quando não passou pela trava. */
  managerUserId?: number | null;
  details: OrderEventDetails;
}

/**
 * Os campos da trava num passo do histórico, a partir de quem liberou (null = não precisou).
 *
 * @example managerFieldsOf(1) // { managerAuthorized: true, managerUserId: 1 }
 */
export function managerFieldsOf(
  managerUserId: number | null,
): Pick<OrderEventInput, 'managerAuthorized' | 'managerUserId'> {
  return { managerAuthorized: managerUserId !== null, managerUserId };
}

/** Um passo lido do histórico: o login compartilhado diz só o perfil (decisão de 2026-10-15). */
export interface OrderEventRecord {
  id: number;
  at: Date;
  userRole: UserRole;
  managerAuthorized: boolean;
  /** Nome do admin que liberou com o código; null nos passos antigos e nos sem trava. */
  managerName: string | null;
  details: OrderEventDetails;
}

function entryText(entry: OrderEntry): string {
  const extras = [
    // O pão vem primeiro e sem "+", como na tela (2026-11-08).
    ...(entry.choice ? [entry.choice.productName] : []),
    ...entry.addons.map((addon) => `+${addon.quantity} ${addon.productName}`),
    ...removalLabels(entry.removals.map((removal) => removal.supplyName)),
    ...(entry.note ? [entry.note] : []),
  ];
  const base = `${entry.quantity}× ${entry.productName}`;
  return extras.length > 0 ? `${base} (${extras.join(', ')})` : base;
}

/**
 * Os itens em uma linha, como o caixa lê: quantidade, nome e, entre parênteses, o pão,
 * adicionais, retiradas e observação.
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
  paymentParts?: PaymentPart[];
}): OrderSnapshot {
  // Só o dividido guarda as partes: os eventos de uma forma ficam como sempre foram.
  const parts = isSplitPayment(order)
    ? { paymentParts: order.paymentParts }
    : {};
  return {
    amount: order.amount,
    paymentMethodId: order.paymentMethodId,
    paymentMode: order.paymentMode,
    items: describeEntries(order.items),
    ...parts,
  };
}
