import { BadRequestException } from '@nestjs/common';
import { describeReceived } from './received-value.js';

// Até 8 dígitos inteiros: as colunas de dinheiro são Decimal(10, 2). Sem o teto, um valor de 14
// dígitos passava aqui e virava 500 no banco (numeric field overflow, S-19 de 2026-11-15).
const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

/**
 * Valida um valor em reais e o devolve como string com 2 casas, sem passar por float.
 * Aceita número ou texto (`25`, `25.5`, `"25.50"`); rejeita negativo, vírgula e 3+ casas.
 *
 * @example parseMoney(25.5, 'amount', false) // '25.50'
 */
export function parseMoney(
  raw: unknown,
  field: string,
  allowZero: boolean,
): string {
  const text = typeof raw === 'number' ? String(raw) : raw;
  if (typeof text !== 'string' || !MONEY_PATTERN.test(text)) {
    throw invalidMoney(field, raw);
  }
  const [integerPart, cents = ''] = text.split('.');
  const normalized = `${Number(integerPart)}.${cents.padEnd(2, '0')}`;
  if (!allowZero && Number(normalized) === 0) throw invalidMoney(field, raw);
  return normalized;
}

function invalidMoney(field: string, raw: unknown): BadRequestException {
  return new BadRequestException(
    `Valor inválido em "${field}": recebido ${describeReceived(raw)}, esperado número não negativo com até 8 dígitos e 2 casas decimais (ex.: 25.50)`,
  );
}

/** Converte um valor já normalizado (`'25.50'`) em centavos inteiros, para somar sem float. */
export function toCents(money: string): number {
  return Math.round(Number(money) * 100);
}

/**
 * Converte centavos inteiros de volta para o formato `'25.50'`.
 *
 * @example formatCents(2550) // '25.50'
 */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
