import { BadRequestException } from '@nestjs/common';
import { parseBusinessDate } from '../closing/business-date.js';
import { parseId, parseObject } from '../common/input-parsers.js';
import { describeReceived } from '../common/received-value.js';

const MAX_ENTRY_ITEMS = 500;

export interface InvoiceStockEntryChoice {
  itemId: number;
  expiresOn: string | null;
}

const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null || value === '';

function parseExpiresOn(raw: unknown, index: number): string | null {
  if (isAbsent(raw)) return null;
  if (typeof raw === 'string') return parseBusinessDate(raw);
  throw new BadRequestException(
    `Campo "items[${index}].expiresOn" inválido: recebido ${describeReceived(raw)}, esperado data YYYY-MM-DD ou null`,
  );
}

function parseChoiceItem(raw: unknown, index: number): InvoiceStockEntryChoice {
  const fields = parseObject(raw, `item ${index + 1} da entrada no estoque`);
  return {
    itemId: parseId(fields.itemId, `items[${index}].itemId`),
    expiresOn: parseExpiresOn(fields.expiresOn, index),
  };
}

function ensureNoDuplicateItems(items: InvoiceStockEntryChoice[]): void {
  const seen = new Set<number>();
  for (const item of items) {
    if (seen.has(item.itemId)) {
      throw new BadRequestException(
        `Item ${item.itemId} repetido na lista: cada item da nota pode ser lançado apenas uma vez`,
      );
    }
    seen.add(item.itemId);
  }
}

/**
 * Valida o corpo do lançamento de itens da nota fiscal no estoque.
 *
 * @example parseInvoiceStockEntryInput({ items: [{ itemId: 1, expiresOn: '2026-11-20' }] })
 */
export function parseInvoiceStockEntryInput(
  body: unknown,
): InvoiceStockEntryChoice[] {
  const fields = parseObject(body, 'lançamento de nota fiscal no estoque');
  const { items } = fields;
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > MAX_ENTRY_ITEMS
  ) {
    throw new BadRequestException(
      `Campo "items" inválido: recebido ${describeReceived(items)}, esperado lista com 1 a ${MAX_ENTRY_ITEMS} itens`,
    );
  }
  const choices = items.map(parseChoiceItem);
  ensureNoDuplicateItems(choices);
  return choices;
}
