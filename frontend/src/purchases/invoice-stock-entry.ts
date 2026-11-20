import { formatQuantity, multiplyQuantities } from '../api/quantity';
import type {
  InvoiceStockEntryInput,
  InvoiceStockEntryItemInput,
} from '../api/purchase-types';
import { formatDayMonth } from './invoice-format';
import { toDateKey } from '../history/date-keys';

/** Início permitido para lançamento de notas fiscais no estoque (decisão do dono). */
export const INVOICE_STOCK_START = '2026-11-14';

/** O que a entrada no estoque precisa saber do item da nota. */
interface StockEntryCandidate {
  id: number;
  outsideBusiness?: boolean;
  link?: { deductOnSale: boolean } | null;
}

/**
 * Determina se o item da nota pode ser marcado para entrada no estoque.
 * Fora da lanchonete, sem ligação ou ligado a insumo sem baixa na venda não entram: o estoque
 * desse insumo é só pela contagem e o lote cresceria até a próxima contagem (dono, 19/11).
 *
 * @example canMarkItemForStockEntry({ outsideBusiness: false, link: { deductOnSale: true } }) // true
 */
export function canMarkItemForStockEntry(
  item: Omit<StockEntryCandidate, 'id'>,
): boolean {
  if (item.outsideBusiness) return false;
  return item.link?.deductOnSale === true;
}

/**
 * Retorna os identificadores dos itens que começam marcados: todos os que podem entrar.
 *
 * @example initialStockEntryItemIds([{ id: 1, outsideBusiness: false, link: { deductOnSale: true } }]) // [1]
 */
export function initialStockEntryItemIds(
  items: StockEntryCandidate[],
): number[] {
  return items.filter(canMarkItemForStockEntry).map((item) => item.id);
}

/**
 * Seleção depois de ligar um item pelo diálogo: marca se o insumo escolhido tem baixa na
 * venda, tira se não tem (ou se a nota recarregada não trouxe o item).
 *
 * @example selectionAfterLink(new Set([1]), 7, reloadedItems) // Set {1, 7} se o 7 tem baixa
 */
export function selectionAfterLink(
  selected: ReadonlySet<number>,
  linkedItemId: number,
  reloadedItems: StockEntryCandidate[],
): Set<number> {
  const next = new Set(selected);
  const item = reloadedItems.find((candidate) => candidate.id === linkedItemId);
  if (item && canMarkItemForStockEntry(item)) next.add(linkedItemId);
  else next.delete(linkedItemId);
  return next;
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
