import { centsToMoney, formatMoney, moneyToCents } from '../api/money';
import type {
  DeliveryZone,
  Order,
  OrderItem,
  PaymentMethod,
  SaleMenuItem,
} from '../api/types';
import type { StaffConsumption } from '../api/staff-consumption-types';
import { formatAddress } from '../cash/address';
import { treeOfOrderItems } from '../cash/item-tree';
import { carryOf, describeOrder } from '../cash/order-description';
import { isOpenAccount } from '../cash/order-filters';
import { formatOrderTime } from '../cash/order-time';
import { describePaymentPart, isSplitOrder } from '../cash/split-payment';
import { addedItems, addedQuantities } from './added-items';
import { ticketItemsOf, type TicketItem } from './ticket-items';
import type { TicketSettings } from './ticket-settings';

/** O que o cupom precisa do dia do caixa (formas e bairros) e de Cadastros → Comanda. */
export interface ReceiptContext {
  paymentMethods: PaymentMethod[];
  zones: DeliveryZone[];
  ticket: TicketSettings;
  /** Cardápio do dia do caixa: os itens de cada combo, para a comanda abrir o combo. */
  menu: SaleMenuItem[];
}

export interface ReceiptTotal {
  label: string;
  value: string;
}

/**
 * Cupom da térmica de 58 mm (decisões de 2026-10-10): a comanda inteira; na edição que mexe nos
 * itens, a comanda inteira de novo com "ALTERADO" (2026-10-15, no lugar da ADIÇÃO); a comanda
 * de acréscimo só com os novos e "ADIÇÃO" (2026-11-08); o consumo interno marcado e sem preços
 * (2026-10-23).
 */
export interface ReceiptModel {
  kind: 'full' | 'changed' | 'staff' | 'added';
  number: string;
  time: string;
  kindLabel: string;
  /** COMER ou VIAGEM (só no balcão; null na entrega e no consumo interno). */
  diningOption: 'EAT_IN' | 'TAKEAWAY' | null;
  /** Cliente da entrega ou o nome do balcão. */
  name: string | null;
  /** Só na entrega: telefone, rua com número, referência e bairro. */
  address: string[];
  /** Os 4 dígitos que o motoboy pede ao cliente (2026-11-21); só na entrega com código. */
  deliveryCode: string | null;
  items: TicketItem[];
  totals: ReceiptTotal[];
  payment: string[];
  /** Só no ALTERADO: o que saiu do pedido, para a chapa não fazer. */
  removed: TicketItem[];
  /** Falso no consumo interno: a equipe não paga, o papel leva só os itens. */
  showPrices: boolean;
  /** Entrega já paga pelo cliente (2026-11-25: "PAGO" grande abaixo da forma). */
  paidMark: boolean;
}

const KIND_LABEL = {
  COUNTER: 'Balcão',
  DELIVERY: 'Entrega',
  IFOOD: 'iFood',
} as const;

/** O tipo no topo da comanda; no iFood (2026-11-23), com o nº do app quando digitado. */
function kindLabelOf(order: Order): string {
  if (!order.type) return 'Pedido';
  const label = KIND_LABEL[order.type];
  return order.type === 'IFOOD' && order.ifoodCode
    ? `${label} nº ${order.ifoodCode}`
    : label;
}

function header(order: Order) {
  return {
    number: `#${order.dayNumber}`,
    time: formatOrderTime(order.createdAt),
    kindLabel: kindLabelOf(order),
    // Pedido antigo (antes de 08/11) não tem a escolha: reimprimir não inventa VIAGEM.
    diningOption: order.type === 'COUNTER' ? order.diningOption : null,
    name: order.customerName,
    deliveryCode: order.type === 'DELIVERY' ? order.deliveryCode : null,
  };
}

/** Endereço da entrega; sem o telefone desde 2026-11-21 (quase não era usado, pedido do usuário). */
function addressLines(order: Order, day: ReceiptContext): string[] {
  if (order.type !== 'DELIVERY') return [];
  const street = formatAddress(
    order.customerStreet ?? '',
    order.customerNumber,
  );
  const reference =
    order.customerReference && `Ref.: ${order.customerReference}`;
  const lines = [street, reference];
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

/** A forma na comanda: uma linha por parte no dividido (card 2), com o valor de cada uma. */
function paymentLines(order: Order, day: ReceiptContext): string[] {
  if (!isSplitOrder(order)) return [describeOrder(order, day).method];
  return order.paymentParts.map((part) =>
    describePaymentPart(part, day.paymentMethods),
  );
}

function payment(order: Order, day: ReceiptContext): string[] {
  if (isOpenAccount(order)) return ['A PAGAR: paga no fim'];
  const lines = paymentLines(order, day);
  if (!order.changeFor) return lines;
  const { changeFor } = order;
  const carry = formatMoney(
    carryOf({ ...order, changeFor }, day.paymentMethods),
  );
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
    items: ticketItemsOf(treeOfOrderItems(order.items), day.ticket, day.menu),
    totals: totals(order),
    payment: payment(order, day),
    removed: [],
    showPrices: true,
    paidMark: order.type === 'DELIVERY' && Boolean(order.prepaid),
  };
}

/**
 * A comanda do consumo interno (2026-10-23): "CONSUMO INTERNO" no topo, para quem e os itens,
 * sem número do dia, preços, totais nem pagamento.
 *
 * @example staffConsumptionReceipt(consumption, ticket, day.menu).name // 'Bianca'
 */
export function staffConsumptionReceipt(
  consumption: StaffConsumption,
  ticket: TicketSettings,
  menu: SaleMenuItem[],
): ReceiptModel {
  return {
    kind: 'staff',
    number: '',
    time: formatOrderTime(consumption.createdAt),
    kindLabel: 'Sem cobrança',
    diningOption: null,
    name: consumption.consumerName,
    address: [],
    deliveryCode: null,
    items: ticketItemsOf(treeOfOrderItems(consumption.items), ticket, menu),
    totals: [],
    payment: [],
    removed: [],
    showPrices: false,
    paidMark: false,
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
  const removed = ticketItemsOf(treeOfOrderItems(gone), day.ticket, day.menu);
  return { ...full, kind: 'changed', items, removed, paidMark: false };
}

/**
 * A comanda de acréscimo (card 8, 2026-11-08): "ADIÇÃO" no topo, só os itens acrescentados,
 * sem a lista de removidos, e o total novo do pedido.
 *
 * @example addedReceipt(depois, antes.items, day).kind // 'added'
 */
export function addedReceipt(
  order: Order,
  before: OrderItem[],
  day: ReceiptContext,
): ReceiptModel {
  const full = fullReceipt(order, day);
  const extras = addedItems(before, order.items);
  const items = ticketItemsOf(treeOfOrderItems(extras), day.ticket, day.menu);
  return { ...full, kind: 'added', items, removed: [], paidMark: false };
}
