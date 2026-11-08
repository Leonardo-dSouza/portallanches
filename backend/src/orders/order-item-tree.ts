import type { OrderEntry, OrderLine } from './order-pricing.js';

/**
 * Linha como está no banco: com o id e o item pai (adicional ou escolha) ou a observação (item).
 * `isChoice` marca a filha que é a escolha obrigatória (o pão, 2026-11-08).
 */
export interface StoredItem extends OrderLine {
  id: number;
  parentItemId: number | null;
  note: string | null;
  isChoice: boolean;
}

const toLine = ({
  id: _id,
  parentItemId: _parent,
  note: _note,
  isChoice: _choice,
  ...line
}: StoredItem): OrderLine => line;

function entryOf(parent: StoredItem, rows: StoredItem[]): OrderEntry {
  const children = rows.filter((r) => r.parentItemId === parent.id);
  const choice = children.find((child) => child.isChoice);
  return {
    ...toLine(parent),
    note: parent.note,
    choice: choice ? toLine(choice) : null,
    addons: children.filter((child) => !child.isChoice).map(toLine),
  };
}

/**
 * Linhas do banco em árvore: cada adicional embaixo do seu item, na ordem gravada, e a escolha
 * (o pão) à parte.
 *
 * @example nestItems(rows)[0].addons.map((a) => a.productName) // ['Add bacon']
 */
export function nestItems(rows: StoredItem[]): OrderEntry[] {
  return rows
    .filter((row) => row.parentItemId === null)
    .map((parent) => entryOf(parent, rows));
}

/**
 * Itens, escolhas e adicionais como linhas soltas, para o valor do pedido e a baixa no estoque
 * (o pão é uma linha comum: preço, CMV e baixa pela composição dele).
 *
 * @example flattenEntries(entries).length // itens + pães + adicionais
 */
export function flattenEntries(entries: OrderEntry[]): OrderLine[] {
  return entries.flatMap(entryLines);
}

/**
 * O item, a escolha e os adicionais de uma linha, soltos e sem a observação.
 *
 * @example entryLines(xSaladaBrioche).map((l) => l.productName) // ['X Salada', 'Pão Brioche']
 */
export function entryLines({
  note: _note,
  choice,
  addons,
  ...line
}: OrderEntry): OrderLine[] {
  return [line, ...(choice ? [choice] : []), ...addons];
}
