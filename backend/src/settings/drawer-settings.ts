import { BadRequestException } from '@nestjs/common';
import { parseMoney, toCents } from '../common/money.js';

export const DRAWER_OPENING_DEFAULT_KEY = 'drawer_opening_default';
export const DRAWER_CASH_TOLERANCE_KEY = 'drawer_cash_tolerance';

/** Padrão da lanchonete: troco inicial de R$ 30,00 e tolerância de R$ 2,00. */
export const DEFAULT_DRAWER_OPENING_DEFAULT = '30.00';
export const DEFAULT_DRAWER_CASH_TOLERANCE = '2.00';

const MAX_DRAWER_CENTS = 999999;

function parseDrawerMoney(raw: unknown, field: string): string {
  const normalized = parseMoney(raw, field, true);
  if (toCents(normalized) > MAX_DRAWER_CENTS) {
    throw new BadRequestException(
      `Campo "${field}" inválido: recebido ${JSON.stringify(raw)}, esperado valor de 0.00 a 9999.99`,
    );
  }
  return normalized;
}

function readStoredDrawerMoney(
  stored: string | null,
  fallback: string,
): string {
  if (stored === null) return fallback;
  try {
    return parseDrawerMoney(stored, 'drawerSetting');
  } catch {
    return fallback;
  }
}

/**
 * Troco inicial padrão da gaveta no início da noite (de 0 a 9999,99).
 *
 * @example parseDrawerOpeningDefault('30') // '30.00'
 */
export function parseDrawerOpeningDefault(raw: unknown): string {
  return parseDrawerMoney(raw, 'drawerOpeningDefault');
}

/**
 * Tolerância aceita na conferência do dinheiro físico (de 0 a 9999,99).
 *
 * @example parseDrawerCashTolerance('2.00') // '2.00'
 */
export function parseDrawerCashTolerance(raw: unknown): string {
  return parseDrawerMoney(raw, 'drawerCashTolerance');
}

/**
 * Lê o troco inicial padrão gravado; ausente ou estragado vira o padrão ('30.00').
 *
 * @example readStoredDrawerOpeningDefault(null) // '30.00'
 */
export function readStoredDrawerOpeningDefault(stored: string | null): string {
  return readStoredDrawerMoney(stored, DEFAULT_DRAWER_OPENING_DEFAULT);
}

/**
 * Lê a tolerância gravada; ausente ou estragada vira o padrão ('2.00').
 *
 * @example readStoredDrawerCashTolerance(null) // '2.00'
 */
export function readStoredDrawerCashTolerance(stored: string | null): string {
  return readStoredDrawerMoney(stored, DEFAULT_DRAWER_CASH_TOLERANCE);
}
