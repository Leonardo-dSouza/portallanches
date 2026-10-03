import { BadRequestException } from '@nestjs/common';
import { parseBusinessDate } from '../closing/business-date.js';
import {
  parseChoice,
  parseId,
  parseObject,
  parseText,
} from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import { parseQuantity } from '../common/quantity.js';
import type { StockCountStatus } from './stock-status.js';

const COUNT_STATUSES: readonly StockCountStatus[] = [
  'COUNTED',
  'NOT_COUNTED',
  'NEEDS_PURCHASE',
];
const MAX_COUNT_ITEMS = 500;
const MAX_ENTRY_ITEMS = 200;
const PAID_PER: readonly PaidPer[] = ['total', 'unit'];

/** Valor pago: pela linha inteira ou por unidade digitada (por fardo, por kg). */
export type PaidPer = 'total' | 'unit';

/** Entrada no estoque: `amount` na unidade de contagem ou em embalagens (`packageName`). */
export interface StockEntryInput {
  supplyId: number;
  amount: string;
  packageName: string | null;
  expiresOn: string | null;
  /** R$ pagos (2 casas); null = não informado, o custo do insumo não muda. */
  paid: string | null;
  paidPer: PaidPer;
}

export interface StockCountItemInput {
  supplyId: number;
  status: StockCountStatus;
  /** Só em COUNTED (zero vale: acabou). */
  quantity: string | null;
}

const isAbsent = (value: unknown) =>
  value === undefined || value === null || value === '';

/** Validade opcional `YYYY-MM-DD`; ausente ou vazia = lote sem validade. */
function parseExpiresOn(raw: unknown): string | null {
  if (isAbsent(raw)) return null;
  if (typeof raw === 'string') return parseBusinessDate(raw);
  throw new BadRequestException(
    `Campo "expiresOn" inválido: recebido ${JSON.stringify(raw)}, esperado data YYYY-MM-DD`,
  );
}

function parseEntryItem(raw: unknown, index: number): StockEntryInput {
  const fields = parseObject(raw, `entrada ${index + 1}`);
  const field = (name: string) => `items[${index}].${name}`;
  return {
    supplyId: parseId(fields.supplyId, field('supplyId')),
    amount: parseQuantity(fields.amount, field('amount'), false),
    packageName: isAbsent(fields.packageName)
      ? null
      : parseText(fields.packageName, field('packageName'), 20),
    expiresOn: parseExpiresOn(fields.expiresOn),
    paid: isAbsent(fields.paid)
      ? null
      : parseMoney(fields.paid, field('paid'), true),
    paidPer: isAbsent(fields.paidPer)
      ? 'total'
      : parseChoice(fields.paidPer, field('paidPer'), PAID_PER),
  };
}

/**
 * Compra lançada de uma vez: `{ items: [...] }`, gravada numa transação só. Um objeto
 * solto (formato antigo, um insumo por vez) vira lista de 1.
 *
 * @example parseStockEntryBatch({ items: [{ supplyId: 3, amount: 2, packageName: 'fardo', paid: 50, paidPer: 'total' }] })
 */
export function parseStockEntryBatch(body: unknown): StockEntryInput[] {
  const fields = parseObject(body, 'entrada de estoque');
  if (fields.items === undefined) return [parseEntryItem(body, 0)];
  const { items } = fields;
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > MAX_ENTRY_ITEMS
  )
    throw new BadRequestException(
      `Campo "items" inválido: recebido ${JSON.stringify(items)}, esperado lista com 1 a ${MAX_ENTRY_ITEMS} entradas`,
    );
  return items.map(parseEntryItem);
}

function parseCountItem(raw: unknown, index: number): StockCountItemInput {
  const fields = parseObject(raw, `contagem ${index + 1}`);
  const status = parseChoice(
    fields.status,
    `items[${index}].status`,
    COUNT_STATUSES,
  );
  const supplyId = parseId(fields.supplyId, `items[${index}].supplyId`);
  if (status !== 'COUNTED') return { supplyId, status, quantity: null };
  const quantity = parseQuantity(
    fields.quantity,
    `items[${index}].quantity`,
    true,
  );
  return { supplyId, status, quantity };
}

function assertDistinctSupplies(items: StockCountItemInput[]): void {
  const ids = items.map((item) => item.supplyId);
  const repeated = ids.find((id, i) => ids.indexOf(id) !== i);
  if (repeated === undefined) return;
  throw new BadRequestException(
    `Insumo ${repeated} aparece mais de uma vez na contagem: esperado um resultado por insumo`,
  );
}

/**
 * Sessão de contagem: um resultado por insumo contado.
 *
 * @example parseStockCountInput({ items: [{ supplyId: 3, status: 'COUNTED', quantity: 8 }] })
 */
export function parseStockCountInput(body: unknown): StockCountItemInput[] {
  const { items } = parseObject(body, 'contagem');
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > MAX_COUNT_ITEMS
  )
    throw new BadRequestException(
      `Campo "items" inválido: recebido ${JSON.stringify(items)}, esperado lista com 1 a ${MAX_COUNT_ITEMS} insumos`,
    );
  const parsed = items.map(parseCountItem);
  assertDistinctSupplies(parsed);
  return parsed;
}
