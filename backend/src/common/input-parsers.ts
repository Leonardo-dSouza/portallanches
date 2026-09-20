import { BadRequestException } from '@nestjs/common';

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
