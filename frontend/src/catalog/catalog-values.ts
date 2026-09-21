import { toApiMoney } from '../api/money';
import { parseDateKey } from '../history/date-keys';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** Mesmo limite do backend (`MAX_NAME_LENGTH`). */
export const MAX_NAME_LENGTH = 80;

/**
 * Nome digitado: sem espaços nas pontas, não vazio e até 80 caracteres.
 *
 * @example parseEntryName('  Gás ', 'nome do tipo') // { ok: true, value: 'Gás' }
 */
export function parseEntryName(text: string, what: string): Parsed<string> {
  const name = text.trim();
  if (name.length === 0)
    return {
      ok: false,
      error: `Informe o ${what}: recebido "${text}", esperado texto não vazio`,
    };
  if (name.length > MAX_NAME_LENGTH)
    return {
      ok: false,
      error: `O ${what} passa de ${MAX_NAME_LENGTH} caracteres: recebido ${name.length}`,
    };
  return { ok: true, value: name };
}

/**
 * Taxa digitada em reais para o formato da API.
 *
 * @example parseZoneFee('8,5') // { ok: true, value: '8.50' }
 */
export function parseZoneFee(text: string): Parsed<string> {
  const fee = toApiMoney(text);
  if (fee === null)
    return {
      ok: false,
      error: `Taxa inválida "${text}": esperado número com até 2 casas (ex.: 8,50)`,
    };
  return { ok: true, value: fee };
}

/** Valor da API para edição na caixa de texto: `'3.00'` vira `'3,00'`. */
export function feeForEditing(apiFee: string): string {
  return apiFee.replace('.', ',');
}

/** Ordem alfabética do português, ignorando maiúsculas e acentos. */
export function sortByLabel<T>(items: T[], label: (item: T) => string): T[] {
  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
  return [...items].sort((a, b) => collator.compare(label(a), label(b)));
}

/**
 * Diária digitada: mesmo formato do dinheiro, mas maior que zero (o backend recusa zero).
 *
 * @example parseRateAmount('65') // { ok: true, value: '65.00' }
 */
export function parseRateAmount(text: string): Parsed<string> {
  const amount = toApiMoney(text);
  if (amount === null || !/[1-9]/.test(amount))
    return {
      ok: false,
      error: `Diária inválida "${text}": esperado valor maior que zero com até 2 casas (ex.: 65,00)`,
    };
  return { ok: true, value: amount };
}

/** Data de vigência digitada (`AAAA-MM-DD`, dia que existe no calendário). */
export function parseEffectiveFrom(text: string): Parsed<string> {
  if (parseDateKey(text) === null)
    return {
      ok: false,
      error: `Data inválida "${text}": informe o dia em que a diária passa a valer`,
    };
  return { ok: true, value: text };
}
