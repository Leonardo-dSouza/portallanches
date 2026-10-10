import { centsToMoney, formatMoney, moneyToCents } from '../api/money';
import type {
  DeliveryZone,
  Order,
  OrderItem,
  PaymentMethod,
} from '../api/types';
import { formatAddress } from '../cash/address';
import { treeOfOrderItems, type ItemTreeRow } from '../cash/item-tree';
import { changeToCarry, describeOrder } from '../cash/order-description';
import { isOpenAccount } from '../cash/order-filters';
import { formatOrderTime } from '../cash/order-time';

/** O que o cupom precisa do dia do caixa (nomes das formas e dos bairros). */
export interface ReceiptContext {
  paymentMethods: PaymentMethod[];
  zones: DeliveryZone[];
}

export interface ReceiptTotal {
  label: string;
  value: string;
}

/**
 * Cupom da térmica de 58 mm (decisões de 2026-10-10): a comanda inteira ou, na edição que
 * acrescenta itens, a ADIÇÃO só com eles.
 */
export interface ReceiptModel {
  kind: 'full' | 'addition';
  number: string;
  time: string;
  kindLabel: string;
  /** Cliente da entrega ou o nome do balcão. */
  name: string | null;
  /** Só na entrega: telefone, rua com número, referência e bairro. */
  address: string[];
  rows: ItemTreeRow[];
  totals: ReceiptTotal[];
  payment: string[];
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
  if (isOpenAccount(order)) return ['ABERTO: paga no fim'];
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
    rows: treeOfOrderItems(order.items),
    totals: totals(order),
    payment: payment(order, day),
  };
}

/**
 * A ADIÇÃO: só os itens que a edição acrescentou, para a chapa (ver `addedItems`).
 *
 * @example additionReceipt(order, [umaCoca]).rows.length // 1
 */
export function additionReceipt(
  order: Order,
  items: OrderItem[],
): ReceiptModel {
  return {
    kind: 'addition',
    ...header(order),
    address: [],
    rows: treeOfOrderItems(items),
    totals: [],
    payment: [],
  };
}
