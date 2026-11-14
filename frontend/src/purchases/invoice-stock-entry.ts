import { formatQuantity, multiplyQuantities } from '../api/quantity';
import type {
  InvoiceStockEntryInput,
  InvoiceStockEntryItemInput,
} from '../api/purchase-types';
import { formatDayMonth } from './invoice-format';
import { toDateKey } from '../history/date-keys';

/** Início permitido para lançamento de notas fiscais no estoque (decisão do dono). */
export const INVOICE_STOCK_START = '2026-11-14';

/**
 * Determina se o item da nota pode ser marcado para entrada no estoque.
 * Itens fora da lanchonete e itens sem ligação ao estoque não podem ser marcados.
 *
 * @example canMarkItemForStockEntry({ outsideBusiness: false, link: { supplyId: 10 } }) // true
 */
export function canMarkItemForStockEntry(item: {
  outsideBusiness?: boolean;
  link?: unknown | null;
}): boolean {
  if (item.outsideBusiness) return false;
  return Boolean(item.link);
}

/**
 * Retorna os identificadores dos itens que começam marcados (todos os ligados e dentro da lanchonete).
 *
 * @example initialStockEntryItemIds([{ id: 1, outsideBusiness: false, link: { supplyId: 10 } }]) // [1]
 */
export function initialStockEntryItemIds(
  items: {
    id: number;
    outsideBusiness?: boolean;
    link?: unknown | null;
  }[],
): number[] {
  return items.filter(canMarkItemForStockEntry).map((item) => item.id);
}

function toMilli(val: string): bigint {
  const [intPart, dec = ''] = val.split('.');
  return BigInt(intPart) * 1000n + BigInt(dec.padEnd(3, '0').slice(0, 3));
}

function fallbackMultiply(a: string, b: string): string {
  const product = toMilli(a) * toMilli(b);
  const milli = (product + 500n) / 1000n;
  const dec = String(milli % 1000n)
    .padStart(3, '0')
    .replace(/0+$/, '');
  const intPart = String(milli / 1000n);
  return dec ? `${intPart}.${dec}` : intPart;
}

/**
 * Converte a quantidade comprada para a unidade de contagem do estoque (apenas exibição).
 *
 * @example formatStockEntryConversion('2', 'Cx', '36') // '2 Cx → 72 un'
 */
export function formatStockEntryConversion(
  quantity: string,
  unit: string,
  baseQuantity: string,
): string {
  const converted =
    multiplyQuantities(quantity, baseQuantity) ??
    fallbackMultiply(quantity, baseQuantity);
  const formattedQty = formatQuantity(quantity);
  const formattedConverted = formatQuantity(converted);
  return `${formattedQty} ${unit} → ${formattedConverted} un`;
}

/**
 * Monta o corpo para a requisição de lançamento no estoque (`POST /purchases/invoices/:id/stock-entry`).
 * Apenas itens marcados entram; validade vazia vai como null.
 *
 * @example buildInvoiceStockEntryPayload([1], { 1: '2026-11-20' }) // { items: [{ itemId: 1, expiresOn: '2026-11-20' }] }
 */
export function buildInvoiceStockEntryPayload(
  selectedIds: Iterable<number>,
  expiresByItem: Record<number, string | null | undefined>,
): InvoiceStockEntryInput {
  const items: InvoiceStockEntryItemInput[] = [];
  for (const id of selectedIds) {
    const rawExpires = expiresByItem[id]?.trim();
    const expiresOn = rawExpires ? rawExpires : null;
    items.push({ itemId: id, expiresOn });
  }
  return { items };
}

/**
 * Formata o selo de lançamento no estoque: "No estoque · 14/11 · nome".
 *
 * @example formatStockEnteredBadge('2026-11-14T15:30:00.000Z', 'Leonardo') // 'No estoque · 14/11 · Leonardo'
 */
export function formatStockEnteredBadge(
  stockEnteredAt: string,
  stockEnteredByName: string | null | undefined,
): string {
  const dayMonth = formatDayMonth(stockEnteredAt);
  if (!stockEnteredByName) {
    return `No estoque · ${dayMonth}`;
  }
  return `No estoque · ${dayMonth} · ${stockEnteredByName}`;
}

/**
 * Verifica se a nota pode ser lançada no estoque (só admin, a partir de 14/11/2026 pela data local e não lançada).
 *
 * @example isEligibleForStockEntry('2026-11-14T12:00:00Z', null, true) // true
 */
export function isEligibleForStockEntry(
  issuedAt: string,
  stockEnteredAt: string | null | undefined,
  isAdmin: boolean,
): boolean {
  if (!isAdmin) return false;
  if (stockEnteredAt) return false;
  const localDate = toDateKey(new Date(issuedAt));
  return localDate >= INVOICE_STOCK_START;
}

/**
 * Formata o rótulo do botão de lançamento no estoque.
 *
 * @example formatStockEntryButtonLabel(2) // 'Lançar 2 itens no estoque'
 */
export function formatStockEntryButtonLabel(count: number): string {
  if (count === 1) return 'Lançar 1 item no estoque';
  return `Lançar ${count} itens no estoque`;
}
