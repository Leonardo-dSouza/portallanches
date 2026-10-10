import type { OrderItem } from '../api/types';
import type { DraftLine } from './order-lines';

/** Tradicional e artesanal repetem o nome; a comanda marca o artesanal. */
const ARTISANAL_CATEGORY = 'Artesanal';
const ADD_PREFIX = /^add\s+/i;

/** Linha da árvore do pedido: o item e, embaixo, os adicionais e a observação. */
export interface ItemTreeRow {
  key: string;
  quantity: number;
  name: string;
  artisanal: boolean;
  details: string[];
}

/**
 * Como o adicional aparece embaixo do item: "Add bacon" → "com bacon"; mais de um por unidade
 * leva a quantidade.
 *
 * @example addonLabel('Add bacon', 2) // 'com 2× bacon'
 */
export function addonLabel(name: string, perUnit: number): string {
  const short = name.replace(ADD_PREFIX, '');
  return perUnit > 1 ? `com ${perUnit}× ${short}` : `com ${short}`;
}

function rowOf(
  key: string,
  base: { quantity: number; name: string; categoryName: string },
  addons: { name: string; perUnit: number }[],
  note: string,
): ItemTreeRow {
  const details = addons.map((a) => addonLabel(a.name, a.perUnit));
  return {
    key,
    quantity: base.quantity,
    name: base.name,
    artisanal: base.categoryName === ARTISANAL_CATEGORY,
    details: note ? [...details, note] : details,
  };
}

/**
 * Árvore de um pedido gravado (pedido do usuário, 2026-10-09: "X Salada / | - com bacon /
 * | - Sem tomate"), na lista de pedidos, na Análise e, depois, na comanda impressa.
 *
 * @example treeOfOrderItems(order.items)[0].details // ['com bacon', 'Sem tomate']
 */
export function treeOfOrderItems(items: OrderItem[]): ItemTreeRow[] {
  return items.map((item, index) =>
    rowOf(
      `${index}-${item.productId}`,
      { ...item, name: item.productName },
      item.addons.map((a) => ({
        name: a.productName,
        perUnit: a.quantity / item.quantity,
      })),
      item.note ?? '',
    ),
  );
}

/**
 * A mesma árvore para a comanda enquanto o caixa digita.
 *
 * @example treeOfDraft(lines)[0].details // ['com bacon']
 */
export function treeOfDraft(lines: DraftLine[]): ItemTreeRow[] {
  return lines.map((line) =>
    rowOf(
      String(line.id),
      line,
      line.addons.map((a) => ({ name: a.name, perUnit: a.quantity })),
      line.note,
    ),
  );
}

const rowText = (row: ItemTreeRow) => {
  const quantity = row.quantity > 1 ? `${row.quantity}× ` : '';
  const artisanal = row.artisanal ? ' (art.)' : '';
  const details = row.details.length ? ` (${row.details.join('; ')})` : '';
  return `${quantity}${row.name}${artisanal}${details}`;
};

/**
 * Pedido numa linha de texto (título da lista de pedidos).
 *
 * @example describeItems(order.items) // '2× X Salada (com bacon; sem tomate), X Salada (art.)'
 */
export function describeItems(items: OrderItem[]): string {
  return treeOfOrderItems(items).map(rowText).join(', ');
}
