import { BadRequestException } from '@nestjs/common';
import { parseObject, parseText } from '../common/input-parsers.js';
import {
  assertDistinctProducts,
  parseProductLine,
  type ProductLineInput,
} from '../common/product-lines.js';

const MAX_ORDER_LINES = 50;
const MAX_ADDONS_PER_LINE = 10;
const MAX_NOTE_LENGTH = 120;
/** Mesmo limite da coluna `order_items.quantity` (CHECK 1 a 99), que guarda o total do adicional. */
const MAX_ROW_QUANTITY = 99;

/** Adicional pedido, com a quantidade **por unidade** do item (2× X Salada + 1 bacon = 2 bacon). */
export type OrderAddonInput = ProductLineInput;

/** Linha pedida: o preço não vem do cliente (o caixa não mexe em preço). */
export interface OrderItemInput extends ProductLineInput {
  /** Texto livre para a comanda ("sem tomate"); não muda o preço. */
  note: string | null;
  addons: OrderAddonInput[];
}

const isAbsent = (value: unknown) => value === undefined || value === null;

function parseNote(raw: unknown, field: string): string | null {
  if (isAbsent(raw) || (typeof raw === 'string' && raw.trim() === ''))
    return null;
  return parseText(raw, field, MAX_NOTE_LENGTH);
}

function parseAddon(raw: unknown, where: string, parentQuantity: number) {
  const fields = parseObject(raw, where);
  if (fields.addons !== undefined || fields.note !== undefined)
    throw new BadRequestException(
      `Campo "${where}" inválido: adicional não leva adicionais nem observação`,
    );
  const addon = parseProductLine(fields, where);
  if (addon.quantity * parentQuantity <= MAX_ROW_QUANTITY) return addon;
  throw new BadRequestException(
    `Campo "${where}.quantity" inválido: ${addon.quantity} por unidade × ${parentQuantity} = ${addon.quantity * parentQuantity}, esperado total até ${MAX_ROW_QUANTITY}`,
  );
}

function parseAddons(raw: unknown, field: string, parentQuantity: number) {
  if (isAbsent(raw)) return [];
  if (!Array.isArray(raw) || raw.length > MAX_ADDONS_PER_LINE)
    throw new BadRequestException(
      `Campo "${field}" inválido: recebido ${JSON.stringify(raw)}, esperado lista com até ${MAX_ADDONS_PER_LINE} adicionais { productId, quantity }`,
    );
  const addons = raw.map((a, i) =>
    parseAddon(a, `${field}[${i}]`, parentQuantity),
  );
  assertDistinctProducts(addons, field);
  return addons;
}

function parseOrderItem(raw: unknown, index: number): OrderItemInput {
  const where = `items[${index}]`;
  const fields = parseObject(raw, where);
  const line = parseProductLine(fields, where);
  const note = parseNote(fields.note, `${where}.note`);
  const addons = parseAddons(fields.addons, `${where}.addons`, line.quantity);
  return { ...line, note, addons };
}

/**
 * Linhas do pedido: produto, quantidade, observação e adicionais (pedido do usuário,
 * 2026-10-09: "X Salada + bacon, sem tomate"). O mesmo produto pode vir em várias linhas.
 *
 * @example parseOrderItems([{ productId: 9, quantity: 1, addons: [{ productId: 33, quantity: 1 }] }])
 */
export function parseOrderItems(raw: unknown): OrderItemInput[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_ORDER_LINES)
    throw new BadRequestException(
      `Campo "items" inválido: recebido ${JSON.stringify(raw)}, esperado lista de 1 a ${MAX_ORDER_LINES} linhas { productId, quantity, note?, addons? }`,
    );
  return raw.map(parseOrderItem);
}

/**
 * Produtos que o pedido usa (linhas e adicionais), sem repetir, para buscar no cardápio.
 *
 * @example productIdsOf(items) // [9, 33, 60]
 */
export function productIdsOf(items: OrderItemInput[]): number[] {
  const ids = items.flatMap((i) => [
    i.productId,
    ...i.addons.map((a) => a.productId),
  ]);
  return [...new Set(ids)];
}
