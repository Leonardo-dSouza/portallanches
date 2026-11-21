import { centsToMoney, moneyToCents, multiplyMoney } from '../api/money';
import type { SaleMenuItem } from '../api/types';
import {
  nameWithMark,
  withoutAddPrefix,
  type ItemTreeRow,
} from '../cash/item-tree';
import { bundleLines } from '../catalog/bundle-form-values';
import { abbreviate } from './abbreviate';
import type { TicketSettings } from './ticket-settings';

/** Adicional na comanda impressa: "+1 LC", unitário e total. */
export interface TicketAddonLine {
  key: string;
  label: string;
  unitPrice: string;
  total: string;
}

/**
 * Item como sai no papel (pedido do usuário, 2026-10-11). O lanche sai em duas linhas: o nome
 * com a largura toda e, por último, o unitário com os adicionais e o total. O resto sai numa
 * linha, com o unitário e o total do item sozinho.
 */
export interface TicketItem {
  key: string;
  layout: 'lanche' | 'inline';
  /** "3 X Bacon Salada Art": quantidade sem "×", nome abreviado e a marca do artesanal. */
  title: string;
  /** O pão do lanche, abreviado e sem preço (2026-11-08); null = sem escolha. */
  choice: string | null;
  addons: TicketAddonLine[];
  /** "s/ Tomate", com as abreviações da comanda. */
  removals: string[];
  /** Combo aberto (2026-11-21): "1 X Salada", "+1 Ched Fatia", sem valor; vazio fora de combo. */
  bundle: string[];
  note: string;
  unitPrice: string;
  total: string;
  /** Na comanda ALTERADO (2026-10-15): "NOVO" (a linha toda) ou "+1 NOVO" (parte dela). */
  newMark?: string;
}

function titleOf(row: ItemTreeRow, ticket: TicketSettings): string {
  const name = abbreviate(row.name, ticket.ticketAbbreviations);
  return `${row.quantity} ${nameWithMark({ ...row, name }, ticket.artisanalMark)}`;
}

/** No lanche, o adicional vale por 1 lanche (unitário × por unidade); no resto, por todos. */
function addonLines(
  row: ItemTreeRow,
  ticket: TicketSettings,
): TicketAddonLine[] {
  return row.addons.map((addon) => ({
    key: addon.key,
    label: `+${addon.perUnit} ${abbreviate(addon.name, ticket.ticketAbbreviations)}`,
    unitPrice: addon.unitPrice,
    total: row.lanche
      ? multiplyMoney(addon.unitPrice, addon.perUnit)
      : addon.total,
  }));
}

/** O lanche completo: o unitário dele, o pão e os adicionais de 1 lanche, em centavos. */
function lancheUnitPrice(row: ItemTreeRow, addons: TicketAddonLine[]): string {
  const addonCents = addons.reduce(
    (sum, addon) => sum + moneyToCents(addon.total),
    0,
  );
  const choiceCents = row.choice ? moneyToCents(row.choice.unitPrice) : 0;
  return centsToMoney(moneyToCents(row.unitPrice) + choiceCents + addonCents);
}

/** Os itens do combo como saem embaixo do nome: quantidade por combo, abreviados. */
function bundleTextOf(
  row: ItemTreeRow,
  ticket: TicketSettings,
  menu: SaleMenuItem[],
): string[] {
  const combo = menu.find((item) => item.id === row.productId);
  if (!combo) return [];
  const rules = ticket.ticketAbbreviations;
  return bundleLines(combo.bundleItems).map((item) =>
    item.addon
      ? `+${item.quantity} ${abbreviate(withoutAddPrefix(item.name), rules)}`
      : `${item.quantity} ${abbreviate(item.name, rules)}`,
  );
}

function ticketItemOf(
  row: ItemTreeRow,
  ticket: TicketSettings,
  menu: SaleMenuItem[],
): TicketItem {
  const addons = addonLines(row, ticket);
  const bundle = bundleTextOf(row, ticket, menu);
  const base = {
    key: row.key,
    title: titleOf(row, ticket),
    choice: row.choice
      ? abbreviate(row.choice.name, ticket.ticketAbbreviations)
      : null,
    addons,
    removals: row.removals.map((removal) =>
      abbreviate(removal, ticket.ticketAbbreviations),
    ),
    note: row.note,
    bundle,
  };
  // O combo aberto sai como o lanche: os itens embaixo e o valor na última linha.
  if (!row.lanche && bundle.length === 0)
    return {
      ...base,
      layout: 'inline',
      unitPrice: row.unitPrice,
      total: row.total,
    };
  const unitPrice = lancheUnitPrice(row, addons);
  return {
    ...base,
    layout: 'lanche',
    unitPrice,
    total: multiplyMoney(unitPrice, row.quantity),
  };
}

/**
 * Os itens da comanda impressa, com as abreviações e a marca de Cadastros → Comanda; o combo sai
 * aberto com os itens do cardápio do dia (`menu`). As contas são só da linha, como no pop-up; o
 * total do pedido continua vindo da API.
 *
 * @example ticketItemsOf(treeOfOrderItems(order.items), ticket, day.menu)[0].title // '3 X Bacon Salada'
 */
export function ticketItemsOf(
  rows: ItemTreeRow[],
  ticket: TicketSettings,
  menu: SaleMenuItem[],
): TicketItem[] {
  return rows.map((row) => ticketItemOf(row, ticket, menu));
}
