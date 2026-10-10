import type { OrderEntry, OrderLine } from './order-pricing.js';

/** Linha como está no banco: com o id e o item pai (adicional) ou a observação (item). */
export interface StoredItem extends OrderLine {
  id: number;
  parentItemId: number | null;
  note: string | null;
}

const toLine = ({
  id: _id,
  parentItemId: _parent,
  note: _note,
  ...line
}: StoredItem): OrderLine => line;

/**
 * Linhas do banco em árvore: cada adicional embaixo do seu item, na ordem gravada.
 *
 * @example nestItems(rows)[0].addons.map((a) => a.productName) // ['Add bacon']
 */
export function nestItems(rows: StoredItem[]): OrderEntry[] {
  return rows
    .filter((row) => row.parentItemId === null)
    .map((parent) => ({
      ...toLine(parent),
      note: parent.note,
      addons: rows.filter((r) => r.parentItemId === parent.id).map(toLine),
    }));
}

/**
 * Itens e adicionais como linhas soltas, para o valor do pedido e a baixa no estoque.
 *
 * @example flattenEntries(entries).length // itens + adicionais
 */
export function flattenEntries(entries: OrderEntry[]): OrderLine[] {
  return entries.flatMap(({ note: _note, addons, ...line }) => [
    line,
    ...addons,
  ]);
}
