import { formatQuantity } from '../api/quantity';
import type { StockItem } from '../api/types';
import { formatDate, formatDateWithWeekday } from '../history/date-keys';
import { isCritical } from './stock-view';

const dayMonth = (dateKey: string) => formatDate(dateKey).slice(0, 5);

/** Observações da linha, na ordem em que importam para quem vai comprar. */
function notesOf(item: StockItem): string[] {
  const { flags, minStock, countUnit, nextExpiry } = item;
  const notes: string[] = [];
  if (flags.needsPurchase) notes.push('precisa comprar');
  if (flags.belowMin && minStock !== null)
    notes.push(`mínimo ${formatQuantity(minStock)} ${countUnit}`);
  if (flags.expired && nextExpiry)
    notes.push(`vencido em ${dayMonth(nextExpiry)}`);
  if (flags.expiringSoon && nextExpiry)
    notes.push(`vence ${dayMonth(nextExpiry)}`);
  if (item.lastCount?.status === 'NOT_COUNTED') notes.push('não contado');
  return notes;
}

function lineOf(item: StockItem): string {
  const quantity = `${formatQuantity(item.quantity)} ${item.countUnit}`;
  const notes = notesOf(item);
  return `- ${item.name}: ${quantity}${notes.length ? ` (${notes.join(', ')})` : ''}`;
}

function section(title: string, items: StockItem[]): string[] {
  return items.length === 0 ? [] : ['', `${title}:`, ...items.map(lineOf)];
}

/**
 * Texto da lista de compras (para colar no WhatsApp ou salvar em .txt): primeiro o que
 * precisa de atenção, depois o saldo dos demais insumos escolhidos.
 *
 * @example buildShoppingList(items, new Set([1, 2]), '2026-09-25')
 */
export function buildShoppingList(
  items: readonly StockItem[],
  selected: ReadonlySet<number>,
  today: string,
): string {
  const chosen = items.filter((item) => selected.has(item.supplyId));
  if (chosen.length === 0) return '';
  const lines = [
    `Lista de compras - ${formatDateWithWeekday(today)}`,
    ...section('Precisa de atenção', chosen.filter(isCritical)),
    ...section(
      'Saldo atual',
      chosen.filter((item) => !isCritical(item)),
    ),
  ];
  return `${lines.join('\n')}\n`;
}
