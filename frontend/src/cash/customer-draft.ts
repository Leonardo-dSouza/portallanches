import type { Customer, Order } from '../api/types';
import { normalizeHouseNumber } from './address';

const PHONE_DIGITS = /^\d{8,13}$/;

/**
 * Cliente como vai ser gravado antes do pedido: o da entrega, com o endereço, ou o do fiado no
 * balcão, que guarda o endereço que já tinha (nulo no cliente só de balcão).
 */
export interface CustomerDraft {
  /** Cadastro existente (achado pelo telefone ou do pedido em edição); null cadastra um novo. */
  id: number | null;
  name: string;
  phone: string | null;
  street: string | null;
  number: string | null;
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

export const NO_FIADO_CUSTOMER =
  'Fiado precisa do cliente: digite o telefone ou o nome';

/** @example phoneDigits('(79) 99999-1234') // '79999991234' */
export const phoneDigits = (typed: string): string => typed.replace(/\D/g, '');

/**
 * Cliente copiado no pedido, usado como cadastro de referência ao editar o pedido. O balcão
 * (fiado) só copia nome e telefone: o endereço fica nulo (ver `resolveCustomerId`).
 */
export function customerOfOrder(order: Order): Customer | null {
  if (order.customerId === null) return null;
  if (order.type === 'COUNTER')
    return {
      id: order.customerId,
      name: order.customerName ?? '',
      phone: order.customerPhone,
      street: null,
      number: null,
      reference: null,
      deliveryZoneId: null,
    };
  if (order.deliveryZoneId === null) return null;
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
  const who = nameAndPhoneOf(fields);
  if (!who.ok) return who;
  const address = addressOf(fields);
  if (!address.ok) return address;
  const base = { ...who.draft, ...address.address };
  const changed = !known || hasChanged(known, base, zoneId);
  return { ok: true, draft: { id: known?.id ?? null, ...base, changed } };
}

type NameAndPhone =
  | { ok: true; draft: Pick<CustomerDraft, 'name' | 'phone'> }
  | { ok: false; error: string };

/** Nome obrigatório e telefone opcional (de 8 a 13 dígitos). */
function nameAndPhoneOf(fields: CustomerFields): NameAndPhone {
  const phone = phoneDigits(fields.phone);
  if (phone && !PHONE_DIGITS.test(phone))
    return {
      ok: false,
      error: `Telefone inválido "${fields.phone}": use de 8 a 13 dígitos ou deixe em branco`,
    };
  const name = fields.customerName.trim();
  if (!name) return { ok: false, error: 'Informe o nome do cliente' };
  return { ok: true, draft: { name, phone: phone || null } };
}

/**
 * Cliente do fiado no balcão (2026-10-25): nome e telefone digitados; o endereço é o que o
 * cadastro achado já tinha (nulo no cliente novo), e só nome ou telefone mudam o cadastro.
 *
 * @example buildCounterCustomerDraft({ phone: '', customerName: 'Maria', street: '', houseNumber: '', reference: '' }, null)
 */
export function buildCounterCustomerDraft(
  fields: CustomerFields,
  known: Customer | null,
): DraftResult {
  if (!fields.customerName.trim() && !phoneDigits(fields.phone))
    return { ok: false, error: NO_FIADO_CUSTOMER };
  const who = nameAndPhoneOf(fields);
  if (!who.ok) return who;
  const { name, phone } = who.draft;
  const address = {
    street: known?.street ?? null,
    number: known?.number ?? null,
    reference: known?.reference ?? null,
  };
  const changed = !known || known.name !== name || known.phone !== phone;
  return {
    ok: true,
    draft: { id: known?.id ?? null, name, phone, ...address, changed },
  };
}
