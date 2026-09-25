import type { Customer, Order } from '../api/types';

const PHONE_DIGITS = /^\d{8,13}$/;

/** Cliente da entrega como vai ser gravado antes do pedido. */
export interface CustomerDraft {
  /** Cadastro existente (achado pelo telefone ou do pedido em edição); null cadastra um novo. */
  id: number | null;
  name: string;
  phone: string | null;
  street: string;
  /** false quando nada mudou em relação ao cadastro: reaproveita o cliente sem gravar. */
  changed: boolean;
}

export interface CustomerFields {
  phone: string;
  customerName: string;
  street: string;
}

export type DraftResult =
  { ok: true; draft: CustomerDraft } | { ok: false; error: string };

/** @example phoneDigits('(79) 99999-1234') // '79999991234' */
export const phoneDigits = (typed: string): string => typed.replace(/\D/g, '');

/** Cliente copiado no pedido, usado como cadastro de referência ao editar o pedido. */
export function customerOfOrder(order: Order): Customer | null {
  if (order.customerId === null || order.deliveryZoneId === null) return null;
  return {
    id: order.customerId,
    name: order.customerName ?? '',
    phone: order.customerPhone,
    street: order.customerStreet ?? '',
    deliveryZoneId: order.deliveryZoneId,
  };
}

function hasChanged(
  known: Customer,
  draft: Omit<CustomerDraft, 'id' | 'changed'>,
  zoneId: number | null,
): boolean {
  return (
    known.name !== draft.name ||
    known.phone !== draft.phone ||
    known.street !== draft.street ||
    known.deliveryZoneId !== zoneId
  );
}

/**
 * Valida nome, telefone (opcional) e rua. `zoneId` null = bairro novo (sempre grava).
 *
 * @example buildCustomerDraft({ phone: '', customerName: 'Ana', street: 'Rua A' }, null, 1)
 */
export function buildCustomerDraft(
  fields: CustomerFields,
  known: Customer | null,
  zoneId: number | null,
): DraftResult {
  const phone = phoneDigits(fields.phone);
  if (phone && !PHONE_DIGITS.test(phone))
    return {
      ok: false,
      error: `Telefone inválido "${fields.phone}": use de 8 a 13 dígitos ou deixe em branco`,
    };
  const name = fields.customerName.trim();
  if (!name) return { ok: false, error: 'Informe o nome do cliente' };
  const street = fields.street.trim();
  if (!street) return { ok: false, error: 'Informe a rua da entrega' };
  const base = { name, phone: phone || null, street };
  const changed = !known || hasChanged(known, base, zoneId);
  return { ok: true, draft: { id: known?.id ?? null, ...base, changed } };
}
