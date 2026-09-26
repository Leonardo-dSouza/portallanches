import { BadRequestException } from '@nestjs/common';
import { parseBusinessDate } from '../closing/business-date.js';
import {
  parseChoice,
  parseId,
  parseObject,
  parseText,
} from '../common/input-parsers.js';
import { parseQuantity } from '../common/quantity.js';
import type { StockCountStatus } from './stock-status.js';

const COUNT_STATUSES: readonly StockCountStatus[] = [
  'COUNTED',
  'NOT_COUNTED',
  'NEEDS_PURCHASE',
];
const MAX_COUNT_ITEMS = 500;

/** Entrada no estoque: `amount` na unidade de contagem ou em embalagens (`packageName`). */
export interface StockEntryInput {
  supplyId: number;
  amount: string;
  packageName: string | null;
  expiresOn: string | null;
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

/**
 * @example parseStockEntryInput({ supplyId: 3, amount: 2, packageName: 'fardo', expiresOn: '2026-10-15' })
 */
export function parseStockEntryInput(body: unknown): StockEntryInput {
  const fields = parseObject(body, 'entrada de estoque');
  return {
    supplyId: parseId(fields.supplyId, 'supplyId'),
    amount: parseQuantity(fields.amount, 'amount', false),
    packageName: isAbsent(fields.packageName)
      ? null
      : parseText(fields.packageName, 'packageName', 20),
    expiresOn: parseExpiresOn(fields.expiresOn),
  };
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
