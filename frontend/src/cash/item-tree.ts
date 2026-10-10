import { multiplyMoney } from '../api/money';
import type { OrderItem } from '../api/types';
import type { DraftLine } from './order-lines';

/** Tradicional e artesanal repetem o nome; a comanda marca o artesanal. */
const ARTISANAL_CATEGORY = 'Artesanal';
/** Açaí sem adicional sai "Açaí 300ml Puro" (pedido do usuário, 2026-10-10). */
const PLAIN_LABEL_CATEGORY = 'Açaí';
const PLAIN_LABEL = 'Puro';
const ADD_PREFIX = /^add\s+/i;

/** Adicional embaixo do item, com o preço de uma unidade e o total (por unidade × itens). */
export interface ItemAddonRow {
  key: string;
  label: string;
  unitPrice: string;
  total: string;
}

/** Linha da árvore do pedido: o item com o preço e, embaixo, os adicionais e a observação. */
export interface ItemTreeRow {
  key: string;
  quantity: number;
  /** Nome para mostrar (com o "Puro" do açaí sem adicional); o banco guarda o do produto. */
  name: string;
  artisanal: boolean;
  unitPrice: string;
  /** Unitário × quantidade, sem os adicionais (eles têm o total deles). */
  total: string;
  addons: ItemAddonRow[];
  /** Observação para a comanda; '' = nenhuma. */
  note: string;
}

/** O que a árvore precisa de um item, gravado ou ainda na comanda. */
interface RowSource {
  key: string;
  quantity: number;
  name: string;
  categoryName: string;
  unitPrice: string;
  note: string;
  addons: {
    productId: number;
    name: string;
    unitPrice: string;
    perUnit: number;
  }[];
}

/**
 * Como o adicional aparece embaixo do item (pedido do usuário, 2026-10-10: mais curto):
 * "Add bacon" → "+ bacon"; mais de um por unidade leva a quantidade.
 *
 * @example addonLabel('Add bacon', 2) // '+ 2× bacon'
 */
export function addonLabel(name: string, perUnit: number): string {
  const short = name.replace(ADD_PREFIX, '');
  return perUnit > 1 ? `+ ${perUnit}× ${short}` : `+ ${short}`;
}

function displayName(source: RowSource): string {
  const plain =
    source.categoryName === PLAIN_LABEL_CATEGORY && source.addons.length === 0;
  return plain ? `${source.name} ${PLAIN_LABEL}` : source.name;
}

function rowOf(source: RowSource): ItemTreeRow {
  return {
    key: source.key,
    quantity: source.quantity,
    name: displayName(source),
    artisanal: source.categoryName === ARTISANAL_CATEGORY,
    unitPrice: source.unitPrice,
    total: multiplyMoney(source.unitPrice, source.quantity),
    addons: source.addons.map((addon) => ({
      key: `${source.key}-${addon.productId}`,
      label: addonLabel(addon.name, addon.perUnit),
      unitPrice: addon.unitPrice,
      total: multiplyMoney(addon.unitPrice, addon.perUnit * source.quantity),
    })),
    note: source.note,
  };
}

/**
 * Árvore de um pedido gravado (pedido do usuário, 2026-10-09: "X Salada / | - + bacon /
 * | - Sem tomate"), na lista de pedidos, na Análise e, depois, na comanda impressa.
 *
 * @example treeOfOrderItems(order.items)[0].addons[0].label // '+ bacon'
 */
export function treeOfOrderItems(items: OrderItem[]): ItemTreeRow[] {
  return items.map((item, index) =>
    rowOf({
      ...item,
      key: `${index}-${item.productId}`,
      name: item.productName,
      note: item.note ?? '',
      addons: item.addons.map((addon) => ({
        ...addon,
        name: addon.productName,
        perUnit: addon.quantity / item.quantity,
      })),
    }),
  );
}

/**
 * A mesma árvore para a comanda enquanto o caixa digita (adicional já por unidade).
 *
 * @example treeOfDraft(lines)[0].total // '35.60'
 */
export function treeOfDraft(lines: DraftLine[]): ItemTreeRow[] {
  return lines.map((line) =>
    rowOf({
      ...line,
      key: String(line.id),
      addons: line.addons.map((addon) => ({
        ...addon,
        perUnit: addon.quantity,
      })),
    }),
  );
}

/**
 * O que vai embaixo do item, em texto: os adicionais e a observação.
 *
 * @example detailsOf(row) // ['+ bacon', 'sem tomate']
 */
export function detailsOf(row: ItemTreeRow): string[] {
  const addons = row.addons.map((addon) => addon.label);
  return row.note ? [...addons, row.note] : addons;
}

const rowText = (row: ItemTreeRow) => {
  const artisanal = row.artisanal ? ' (art.)' : '';
  const details = detailsOf(row);
  const suffix = details.length ? ` (${details.join('; ')})` : '';
  return `${row.quantity}× ${row.name}${artisanal}${suffix}`;
};

/**
 * Pedido numa linha de texto (título da lista de pedidos).
 *
 * @example describeItems(order.items) // '2× X Salada (+ bacon; sem tomate), 1× X Salada (art.)'
 */
export function describeItems(items: OrderItem[]): string {
  return treeOfOrderItems(items).map(rowText).join(', ');
}
