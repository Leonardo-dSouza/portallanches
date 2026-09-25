import { BadRequestException } from '@nestjs/common';
import { parseId, parseObject, parseText } from '../common/input-parsers.js';

const MAX_NAME_LENGTH = 80;
const MAX_STREET_LENGTH = 120;
// 8-9 dígitos sem DDD (anotado no papel), 10-11 com DDD, até 13 com o 55 do país.
const PHONE_DIGITS = /^\d{8,13}$/;

/** Corpo de cliente já validado; telefone só com dígitos ou null. */
export interface CustomerInput {
  name: string;
  phone: string | null;
  street: string;
  deliveryZoneId: number;
}

/**
 * Telefone só com dígitos; vazio/ausente vira null (cliente sem telefone).
 *
 * @example parsePhone('(79) 99999-1234') // '79999991234'
 */
export function parsePhone(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const digits = typeof raw === 'string' ? raw.replace(/\D/g, '') : '';
  if (PHONE_DIGITS.test(digits)) return digits;
  throw new BadRequestException(
    `Campo "phone" inválido: recebido ${JSON.stringify(raw)}, esperado telefone com 8 a 13 dígitos`,
  );
}

/**
 * Filtro opcional de bairro vindo da query string (`?deliveryZoneId=3`).
 *
 * @example parseZoneFilter('3') // 3
 */
export function parseZoneFilter(raw: unknown): number | null {
  if (raw === undefined || raw === '') return null;
  const id = typeof raw === 'string' ? Number(raw) : Number.NaN;
  if (Number.isInteger(id) && id > 0) return id;
  throw new BadRequestException(
    `Parâmetro "deliveryZoneId" inválido: recebido ${JSON.stringify(raw)}, esperado inteiro positivo`,
  );
}

/**
 * Valida o corpo de um cliente vindo da API.
 *
 * @example parseCustomerInput({ name: 'Ana', phone: '79 99999-1234', street: 'Rua A', deliveryZoneId: 3 })
 */
export function parseCustomerInput(body: unknown): CustomerInput {
  const fields = parseObject(body, 'cliente');
  return {
    name: parseText(fields.name, 'name', MAX_NAME_LENGTH),
    phone: parsePhone(fields.phone),
    street: parseText(fields.street, 'street', MAX_STREET_LENGTH),
    deliveryZoneId: parseId(fields.deliveryZoneId, 'deliveryZoneId'),
  };
}
