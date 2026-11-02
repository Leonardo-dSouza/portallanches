import { formatCents, toCents } from '../common/money.js';
import type { OrderType } from '../orders/order-input.js';
import { remainingCents } from '../orders/order-fiado.js';
import type {
  FiadoCustomerRecord,
  FiadoOrderRecord,
  FiadoPaymentRecord,
} from './fiado-repository.js';

/** Um pedido fiado nas listas: a noite e o número, o valor, o recebido, o que falta e a previsão. */
export interface FiadoOrderView {
  orderId: number;
  businessDate: string;
  dayNumber: number;
  type: OrderType | null;
  amount: string;
  paidTotal: string;
  remaining: string;
  dueDate: string | null;
}

/** Quem deve (`GET /fiado/open`): o cliente, o total em aberto e os pedidos que faltam pagar. */
export interface FiadoDebtor {
  customerId: number;
  name: string;
  phone: string | null;
  openTotal: string;
  orders: FiadoOrderView[];
}

/** Quem quitou tudo (`GET /fiado/settled`, 2026-11-01): a linha da aba Fiado. */
export interface FiadoSettledCustomer {
  customerId: number;
  name: string;
  phone: string | null;
  ordersCount: number;
  /** Soma dos pedidos fiado do cliente (sem o adicional). */
  paidTotal: string;
  /** Última noite com pagamento. */
  lastPaidOn: string | null;
}

/** Fiado a cobrar na noite (`GET /fiado/due`): o pedido com o cliente. */
export interface FiadoDueOrder extends FiadoOrderView {
  customerId: number;
  customerName: string;
  customerPhone: string | null;
}

/** O extrato do cliente: em aberto, pagos e os recebimentos (os estornados também). */
export interface FiadoStatement {
  customer: FiadoCustomerRecord;
  openTotal: string;
  openOrders: FiadoOrderView[];
  paidOrders: FiadoOrderView[];
  payments: FiadoPaymentRecord[];
}

/** @example orderViewOf(record).remaining // '27.00' */
export function orderViewOf(record: FiadoOrderRecord): FiadoOrderView {
  return {
    orderId: record.orderId,
    businessDate: record.businessDate,
    dayNumber: record.dayNumber,
    type: record.type,
    amount: record.amount,
    paidTotal: record.paid,
    remaining: formatCents(remainingCents(record)),
    dueDate: record.dueDate,
  };
}

const isOpen = (record: FiadoOrderRecord): boolean =>
  remainingCents(record) > 0;

/**
 * Quanto falta em todos os pedidos (o "deve no total" do cliente).
 *
 * @example openTotalOf(pedidosDaMaria) // '37.00'
 */
export function openTotalOf(records: FiadoOrderRecord[]): string {
  const cents = records.reduce((sum, r) => sum + remainingCents(r), 0);
  return formatCents(cents);
}

function debtorOf(records: FiadoOrderRecord[]): FiadoDebtor {
  const [first] = records;
  return {
    customerId: first.customerId,
    name: first.customerName,
    phone: first.customerPhone,
    openTotal: openTotalOf(records),
    orders: records.map(orderViewOf),
  };
}

function byCustomer(records: FiadoOrderRecord[]): FiadoOrderRecord[][] {
  const groups = new Map<number, FiadoOrderRecord[]>();
  for (const record of records) {
    groups.set(record.customerId, [
      ...(groups.get(record.customerId) ?? []),
      record,
    ]);
  }
  return [...groups.values()];
}

/**
 * Quem deve: um por cliente, só os pedidos com algo a pagar, em ordem de nome (a aba Fiado tem
 * a busca).
 *
 * @example debtorsOf(records)[0] // { name: 'Maria', openTotal: '37.00', orders: [...] }
 */
export function debtorsOf(records: FiadoOrderRecord[]): FiadoDebtor[] {
  return byCustomer(records.filter(isOpen))
    .map(debtorOf)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function settledCustomerOf(
  records: FiadoOrderRecord[],
  nights: Map<number, string>,
): FiadoSettledCustomer {
  const [first] = records;
  const paidOn = records.flatMap((r) => nights.get(r.orderId) ?? []).sort();
  return {
    customerId: first.customerId,
    name: first.customerName,
    phone: first.customerPhone,
    ordersCount: records.length,
    paidTotal: formatCents(
      records.reduce((sum, r) => sum + toCents(r.amount), 0),
    ),
    lastPaidOn: paidOn.at(-1) ?? null,
  };
}

/**
 * Quem quitou tudo: o cliente com fiado e nada em aberto, o pagamento mais recente primeiro.
 * Quem ainda deve fica em `debtorsOf`, e o extrato dele já mostra os pedidos pagos.
 *
 * @example settledOf(records, nights)[0] // { name: 'Maria', lastPaidOn: '2026-11-01', … }
 */
export function settledOf(
  records: FiadoOrderRecord[],
  nights: Map<number, string>,
): FiadoSettledCustomer[] {
  return byCustomer(records)
    .filter((own) => !own.some(isOpen))
    .map((own) => settledCustomerOf(own, nights))
    .sort((a, b) => (b.lastPaidOn ?? '').localeCompare(a.lastPaidOn ?? ''));
}

/**
 * Os fiados a cobrar na noite `date` (2026-10-25): de outras noites, com a previsão até a data
 * (o atrasado aparece toda noite até pagar) e algo a pagar; o mais atrasado primeiro.
 *
 * @example dueOn(records, '2026-10-25')[0].dueDate // '2026-10-20'
 */
export function dueOn(
  records: FiadoOrderRecord[],
  date: string,
): FiadoDueOrder[] {
  const due = records.filter(
    (r) =>
      isOpen(r) &&
      r.businessDate !== date &&
      r.dueDate !== null &&
      r.dueDate <= date,
  );
  const byDue = (a: FiadoOrderRecord, b: FiadoOrderRecord) =>
    (a.dueDate ?? '').localeCompare(b.dueDate ?? '') ||
    a.businessDate.localeCompare(b.businessDate);
  return due.sort(byDue).map((record) => ({
    ...orderViewOf(record),
    customerId: record.customerId,
    customerName: record.customerName,
    customerPhone: record.customerPhone,
  }));
}

/**
 * O extrato do cliente: os pedidos em aberto, os pagos e os recebimentos como vieram.
 *
 * @example statementOf(maria, records, payments).openTotal // '27.00'
 */
export function statementOf(
  customer: FiadoCustomerRecord,
  records: FiadoOrderRecord[],
  payments: FiadoPaymentRecord[],
): FiadoStatement {
  return {
    customer,
    openTotal: openTotalOf(records),
    openOrders: records.filter(isOpen).map(orderViewOf),
    paidOrders: records.filter((r) => !isOpen(r)).map(orderViewOf),
    payments,
  };
}
