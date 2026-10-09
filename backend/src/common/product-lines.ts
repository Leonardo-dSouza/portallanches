import { BadRequestException } from '@nestjs/common';
import { parseId, parseObject } from './input-parsers.js';

const MAX_LINE_QUANTITY = 99;

/** Uma linha de produto com quantidade inteira (item do pedido, item do combo). */
export interface ProductLineInput {
  productId: number;
  quantity: number;
}

export interface LineLimits {
  min: number;
  max: number;
}

function parseLineQuantity(raw: unknown, field: string): number {
  const ok = typeof raw === 'number' && Number.isInteger(raw);
  if (ok && raw >= 1 && raw <= MAX_LINE_QUANTITY) return raw;
  throw new BadRequestException(
    `Campo "${field}" inválido: recebido ${JSON.stringify(raw)}, esperado inteiro de 1 a ${MAX_LINE_QUANTITY}`,
  );
}

function parseLine(raw: unknown, where: string): ProductLineInput {
  const fields = parseObject(raw, where);
  return {
    productId: parseId(fields.productId, `${where}.productId`),
    quantity: parseLineQuantity(fields.quantity, `${where}.quantity`),
  };
}

/** O mesmo produto em duas linhas é recusado: a tela soma a quantidade numa linha só. */
function assertDistinctProducts(
  lines: ProductLineInput[],
  field: string,
): void {
  const ids = lines.map((line) => line.productId);
  const repeated = ids.find((id, i) => ids.indexOf(id) !== i);
  if (repeated === undefined) return;
  throw new BadRequestException(
    `Campo "${field}" inválido: produto ${repeated} repetido, esperado uma linha por produto`,
  );
}

/**
 * Lista de linhas `{ productId, quantity }` (quantidade inteira de 1 a 99), de `min` a `max`
 * linhas, sem produto repetido. `field` entra nas mensagens.
 *
 * @example parseProductLines([{ productId: 9, quantity: 2 }], 'items', { min: 1, max: 50 })
 */
export function parseProductLines(
  raw: unknown,
  field: string,
  { min, max }: LineLimits,
): ProductLineInput[] {
  if (!Array.isArray(raw) || raw.length < min || raw.length > max)
    throw new BadRequestException(
      `Campo "${field}" inválido: recebido ${JSON.stringify(raw)}, esperado lista de ${min} a ${max} linhas { productId, quantity }`,
    );
  const lines = raw.map((line, index) => parseLine(line, `${field}[${index}]`));
  assertDistinctProducts(lines, field);
  return lines;
}
