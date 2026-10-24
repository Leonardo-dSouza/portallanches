import { centsToMoney, formatMoney, moneyToCents } from '../api/money';
import type {
  DeliveryZone,
  Order,
  OrderItem,
  PaymentMethod,
} from '../api/types';
import type { StaffConsumption } from '../api/staff-consumption-types';
import { formatAddress } from '../cash/address';
import { treeOfOrderItems } from '../cash/item-tree';
import { changeToCarry, describeOrder } from '../cash/order-description';
import { isOpenAccount } from '../cash/order-filters';
import { formatOrderTime } from '../cash/order-time';
import { addedItems, addedQuantities } from './added-items';
import { ticketItemsOf, type TicketItem } from './ticket-items';
import type { TicketSettings } from './ticket-settings';

/** O que o cupom precisa do dia do caixa (formas e bairros) e de Cadastros → Comanda. */
export interface ReceiptContext {
  paymentMethods: PaymentMethod[];
  zones: DeliveryZone[];
  ticket: TicketSettings;
}

export interface ReceiptTotal {
  label: string;
  value: string;
}

/**
 * Cupom da térmica de 58 mm (decisões de 2026-10-10): a comanda inteira; na edição que mexe nos
 * itens, a comanda inteira de novo com "ALTERADO" (2026-10-15, no lugar da ADIÇÃO); o consumo
 * interno marcado e sem preços (2026-10-23).
 */
export interface ReceiptModel {
  kind: 'full' | 'changed' | 'staff';
  number: string;
  time: string;
  kindLabel: string;
  /** Cliente da entrega ou o nome do balcão. */
  name: string | null;
  /** Só na entrega: telefone, rua com número, referência e bairro. */
  address: string[];
  items: TicketItem[];
  totals: ReceiptTotal[];
  payment: string[];
  /** Só no ALTERADO: o que saiu do pedido, para a chapa não fazer. */
  removed: TicketItem[];
  /** Falso no consumo interno: a equipe não paga, o papel leva só os itens. */
  showPrices: boolean;
}

const KIND_LABEL = { COUNTER: 'Balcão', DELIVERY: 'Entrega' } as const;

function header(order: Order) {
  return {
    number: `#${order.dayNumber}`,
    time: formatOrderTime(order.createdAt),
    kindLabel: order.type ? KIND_LABEL[order.type] : 'Pedido',
    name: order.customerName,
  };
}

function addressLines(order: Order, day: ReceiptContext): string[] {
  if (order.type !== 'DELIVERY') return [];
  const street = formatAddress(
    order.customerStreet ?? '',
    order.customerNumber,
  );
  const reference =
    order.customerReference && `Ref.: ${order.customerReference}`;
  const lines = [order.customerPhone, street, reference];
  return [...lines, describeOrder(order, day).neighborhood].filter(
    (line): line is string => Boolean(line),
  );
}

function totals(order: Order): ReceiptTotal[] {
  const total = { label: 'Total', value: formatMoney(order.amount) };
  if (order.type !== 'DELIVERY' || !order.deliveryFee) return [total];
  const itemsCents =
    moneyToCents(order.amount) - moneyToCents(order.deliveryFee);
  return [
    { label: 'Itens', value: formatMoney(centsToMoney(itemsCents)) },
    { label: 'Taxa', value: formatMoney(order.deliveryFee) },
    total,
  ];
}

function payment(order: Order, day: ReceiptContext): string[] {
  if (isOpenAccount(order)) return ['A PAGAR: paga no fim'];
  const lines = [describeOrder(order, day).method];
  if (!order.changeFor) return lines;
  const carry = formatMoney(changeToCarry(order.changeFor, order.amount));
  return [
    ...lines,
    `Troco para ${formatMoney(order.changeFor)} (levar ${carry})`,
  ];
}

/**
 * A comanda inteira: impressa ao salvar o pedido novo e pelo Reimprimir.
 *
 * @example fullReceipt(order, day).number // '#12'
 */
export function fullReceipt(order: Order, day: ReceiptContext): ReceiptModel {
  return {
    kind: 'full',
    ...header(order),
    address: addressLines(order, day),
    items: ticketItemsOf(treeOfOrderItems(order.items), day.ticket),
    totals: totals(order),
    payment: payment(order, day),
    removed: [],
    showPrices: true,
  };
}

/**
 * A comanda do consumo interno (2026-10-23): "CONSUMO INTERNO" no topo, para quem e os itens,
 * sem número do dia, preços, totais nem pagamento.
 *
 * @example staffConsumptionReceipt(consumption, ticket).name // 'Bianca'
 */
export function staffConsumptionReceipt(
  consumption: StaffConsumption,
  ticket: TicketSettings,
): ReceiptModel {
  return {
    kind: 'staff',
    number: '',
    time: formatOrderTime(consumption.createdAt),
    kindLabel: 'Sem cobrança',
    name: consumption.consumerName,
    address: [],
    items: ticketItemsOf(treeOfOrderItems(consumption.items), ticket),
    totals: [],
    payment: [],
    removed: [],
    showPrices: false,
  };
}

/** "NOVO" quando a linha inteira é nova; "+1 NOVO" quando só parte dela. */
function newMarkOf(added: number, quantity: number): string | undefined {
  if (added === 0) return undefined;
  return added === quantity ? 'NOVO' : `+${added} NOVO`;
}

/**
 * A comanda inteira da edição que mexeu nos itens (pedido do usuário, 2026-10-15: "não ficou
 * legal essa impressão de Adicionado, tem que ir o pedido completo"): os itens novos marcados e,
 * no fim, o que saiu.
 *
 * @example changedReceipt(depois, antes.items, day).removed[0].title // '1 Coca Cola 600ml'
 */
export function changedReceipt(
  order: Order,
  before: OrderItem[],
  day: ReceiptContext,
): ReceiptModel {
  const full = fullReceipt(order, day);
  const added = addedQuantities(before, order.items);
  const items = full.items.map((item, index) => ({
    ...item,
    newMark: newMarkOf(added[index], order.items[index].quantity),
  }));
  const gone = addedItems(order.items, before);
  const removed = ticketItemsOf(treeOfOrderItems(gone), day.ticket);
  return { ...full, kind: 'changed', items, removed };
}
