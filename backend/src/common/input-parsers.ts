import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describeReceived } from './received-value.js';

const fail = (field: string, raw: unknown, expected: string): never => {
  throw new BadRequestException(
    `Campo "${field}" inválido: recebido ${describeReceived(raw)}, esperado ${expected}`,
  );
};

/** Garante que o corpo é um objeto JSON; `what` descreve o recurso na mensagem. */
export function parseObject(
  body: unknown,
  what: string,
): Record<string, unknown> {
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  throw new BadRequestException(
    `Corpo inválido: recebido ${describeReceived(body)}, esperado objeto JSON de ${what}`,
  );
}

export function parseId(raw: unknown, field: string): number {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) return raw;
  return fail(field, raw, 'inteiro positivo');
}

export function parseNonNegativeInt(raw: unknown, field: string): number {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) return raw;
  return fail(field, raw, 'inteiro maior ou igual a 0');
}

// Caracteres de controle Unicode (categoria Cc: C0 \x00–\x1F e C1 \x7F–\x9F).
// Bloqueia caracteres que quebram a UI e a impressão de comandas (ex.: DEL \x7F entrou em produção).
const CONTROL_CHAR_PATTERN = /\p{Cc}/u;

function formatControlChar(char: string): string {
  const code = char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
  return `\\x${code}`;
}

function assertNoControlChars(value: string, field: string): void {
  const match = value.match(CONTROL_CHAR_PATTERN);
  if (!match) return;
  const rejected = formatControlChar(match[0]);
  throw new BadRequestException(
    `Campo "${field}" inválido: recebido caractere de controle ${rejected}, esperado texto sem caracteres de controle`,
  );
}

/**
 * Texto aparado, de 1 a `maxLength` caracteres, sem caracteres de controle Unicode (Cc).
 *
 * @example parseText('  PIX ', 'name', 10) // 'PIX'
 */
export function parseText(
  raw: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof raw !== 'string') {
    return fail(field, raw, `texto de 1 a ${maxLength} caracteres`);
  }
  // Confere depois do trim: espaço, tab ou quebra de linha nas pontas (colar texto) seguem só aparados.
  const text = raw.trim();
  assertNoControlChars(text, field);
  if (text.length > 0 && text.length <= maxLength) return text;
  return fail(field, raw, `texto de 1 a ${maxLength} caracteres`);
}

export function parseBoolean(raw: unknown, field: string): boolean {
  if (typeof raw === 'boolean') return raw;
  return fail(field, raw, 'true ou false');
}

export function parseChoice<T extends string>(
  raw: unknown,
  field: string,
  options: readonly T[],
): T {
  const match = options.find((option) => option === raw);
  if (match) return match;
  return fail(field, raw, options.map((o) => `"${o}"`).join(' ou '));
}

/**
 * Primeiro valor que aparece de novo na lista, ou `undefined`. Uma passada com `Set`: o
 * `indexOf` dentro do `find` era quadrático (160 mil posições = 18 s, S-05 de 2026-11-15).
 *
 * @example firstRepeated([3, 1, 3]) // 3
 */
export function firstRepeated<T>(values: readonly T[]): T | undefined {
  const seen = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}

/**
 * Lista do corpo com tamanho entre `min` e `max`. Toda lista que vem do corpo tem teto: sem ele,
 * uma lista enorme segurava o servidor (S-05 de 2026-11-15).
 *
 * @example parseBoundedList(body.ids, 'ids', 1, 500) // body.ids
 */
export function parseBoundedList(
  raw: unknown,
  field: string,
  min: number,
  max: number,
): unknown[] {
  if (Array.isArray(raw) && raw.length >= min && raw.length <= max) return raw;
  const received = Array.isArray(raw)
    ? `lista com ${raw.length} itens`
    : describeReceived(raw);
  throw new BadRequestException(
    `Campo "${field}" inválido: recebido ${received}, esperado lista com ${min} a ${max} itens`,
  );
}

/** Itens de uma nota: a maior nota real tem dezenas; 500 sobra. */
const MAX_POSITIONS = 500;
/** Itens de uma lista reordenada (categorias, formas, produtos de uma categoria). */
const MAX_ORDER_IDS = 500;

/**
 * Lista de posições (inteiros positivos, sem repetir), que pode vir vazia: os itens da nota fora
 * da lanchonete (2026-10-25), do gasto ou de Compras.
 *
 * @example parsePositionList([2, 5], 'outsidePositions') // [2, 5]
 */
export function parsePositionList(raw: unknown, field: string): number[] {
  const list = parseBoundedList(raw, field, 0, MAX_POSITIONS);
  const parsed = list.map((value, index) =>
    parseId(value, `${field}[${index}]`),
  );
  const repeated = firstRepeated(parsed);
  if (repeated !== undefined)
    throw new BadRequestException(
      `Campo "${field}" com a posição ${repeated} repetida: esperado cada item uma vez`,
    );
  return parsed;
}

/**
 * Ordem nova de uma lista (`{ ids: [3, 1, 2] }`), sem id repetido. `what` nomeia o item nas
 * mensagens ("categoria", "forma de pagamento").
 *
 * @example parseIdOrder({ ids: [3, 1, 2] }, 'categoria') // [3, 1, 2]
 */
export function parseIdOrder(body: unknown, what: string): number[] {
  const { ids } = parseObject(body, `ordem (${what})`);
  const list = parseBoundedList(ids, 'ids', 1, MAX_ORDER_IDS);
  const parsed = list.map((id, index) => parseId(id, `ids[${index}]`));
  const repeated = firstRepeated(parsed);
  if (repeated !== undefined)
    throw new BadRequestException(
      `Campo "ids" com id repetido: ${repeated}; esperado cada ${what} uma vez`,
    );
  return parsed;
}

/**
 * A ordem nova traz exatamente os itens que existem (nem falta, nem sobra).
 *
 * @example assertCompleteOrder([3, 1, 2], [1, 2, 3]) // ok
 */
export function assertCompleteOrder(ids: number[], known: number[]): void {
  const same =
    ids.length === known.length && known.every((id) => ids.includes(id));
  if (same) return;
  throw new UnprocessableEntityException(
    `Ordem com ids ${ids.join(', ')}: esperado exatamente os ids ${[...known].sort((a, b) => a - b).join(', ')}`,
  );
}
