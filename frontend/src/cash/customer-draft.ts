import type { Customer, Order } from '../api/types';
import { normalizeHouseNumber } from './address';

const PHONE_DIGITS = /^\d{8,13}$/;

/** Cliente da entrega como vai ser gravado antes do pedido. */
export interface CustomerDraft {
  /** Cadastro existente (achado pelo telefone ou do pedido em edição); null cadastra um novo. */
  id: number | null;
  name: string;
  phone: string | null;
  street: string;
  number: string;
  reference: string | null;
  /** false quando nada mudou em relação ao cadastro: reaproveita o cliente sem gravar. */
  changed: boolean;
}

export interface CustomerFields {
  phone: string;
  customerName: string;
  street: string;
  /** Número da casa como digitado ("S/N" para sem número). */
  houseNumber: string;
  reference: string;
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
    number: order.customerNumber,
    reference: order.customerReference,
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
    known.number !== draft.number ||
    known.reference !== draft.reference ||
    known.deliveryZoneId !== zoneId
  );
}

type AddressResult =
  | {
      ok: true;
      address: Pick<CustomerDraft, 'street' | 'number' | 'reference'>;
    }
  | { ok: false; error: string };

/** Rua e número obrigatórios (o número sai na comanda do motoboy); referência opcional. */
function addressOf(fields: CustomerFields): AddressResult {
  const street = fields.street.trim();
  if (!street) return { ok: false, error: 'Informe a rua da entrega' };
  const number = normalizeHouseNumber(fields.houseNumber);
  if (!number) return { ok: false, error: 'Informe o número da casa (ou S/N)' };
  const reference = fields.reference.trim() || null;
  return { ok: true, address: { street, number, reference } };
}

/**
 * Valida nome, telefone (opcional), rua e número (a referência é opcional). `zoneId` null =
 * bairro novo (sempre grava).
 *
 * @example buildCustomerDraft({ phone: '', customerName: 'Ana', street: 'Rua A', houseNumber: '12', reference: '' }, null, 1)
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
  const address = addressOf(fields);
  if (!address.ok) return address;
  const base = { name, phone: phone || null, ...address.address };
  const changed = !known || hasChanged(known, base, zoneId);
  return { ok: true, draft: { id: known?.id ?? null, ...base, changed } };
}
