import type { OrderStatus, PaymentMode, UserRole } from './types';

/** O pedido num instante, como o histórico guarda (espelha `OrderSnapshot` do backend). */
export interface OrderSnapshot {
  amount: string;
  /** Null = "A pagar". */
  paymentMethodId: number | null;
  paymentMode: PaymentMode | null;
  /** Os itens em uma linha ("2× X Salada (+2 Add bacon), 1× Coca Cola 600ml"). */
  items: string;
}

export type OrderEventDetails =
  | { kind: 'CREATED'; order: OrderSnapshot }
  | { kind: 'EDITED'; before: OrderSnapshot; after: OrderSnapshot }
  | { kind: 'STATUS'; from: OrderStatus; to: OrderStatus }
  | { kind: 'CANCELED'; reason: string }
  | { kind: 'RESTORED' };

/** Um passo do histórico do pedido (2026-10-15): o login é compartilhado, então só o perfil. */
export interface OrderEvent {
  id: number;
  /** ISO. */
  at: string;
  userRole: UserRole;
  /** A senha do admin liberou o passo no PC do caixa. */
  managerAuthorized: boolean;
  details: OrderEventDetails;
}
