import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

const fail = (field: string, raw: unknown, expected: string): never => {
  throw new BadRequestException(
    `Campo "${field}" inválido: recebido ${JSON.stringify(raw)}, esperado ${expected}`,
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
    `Corpo inválido: recebido ${JSON.stringify(body)}, esperado objeto JSON de ${what}`,
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

/** Texto aparado, de 1 a `maxLength` caracteres. */
export function parseText(
  raw: unknown,
  field: string,
  maxLength: number,
): string {
  const text = typeof raw === 'string' ? raw.trim() : '';
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
 * Lista de posições (inteiros positivos, sem repetir), que pode vir vazia: os itens da nota fora
 * da lanchonete (2026-10-25), do gasto ou de Compras.
 *
 * @example parsePositionList([2, 5], 'outsidePositions') // [2, 5]
 */
export function parsePositionList(raw: unknown, field: string): number[] {
  if (!Array.isArray(raw))
    throw new BadRequestException(
      `Campo "${field}" inválido: recebido ${JSON.stringify(raw)}, esperado lista de posições de item (ex.: [2, 5])`,
    );
  const parsed = raw.map((value, index) =>
    parseId(value, `${field}[${index}]`),
  );
  const repeated = parsed.find((p, index) => parsed.indexOf(p) !== index);
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
  if (!Array.isArray(ids) || ids.length === 0)
    throw new BadRequestException(
      `Campo "ids" inválido: recebido ${JSON.stringify(ids)}, esperado lista não vazia de ids de ${what}`,
    );
  const parsed = ids.map((id, index) => parseId(id, `ids[${index}]`));
  const repeated = parsed.find((id, index) => parsed.indexOf(id) !== index);
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
