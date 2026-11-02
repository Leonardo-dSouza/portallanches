import type { FiadoDebtor, FiadoSettledCustomer } from '../api/fiado-types';
import type { Money } from '../api/types';
import { phoneDigits } from '../cash/customer-draft';
import { toNeighborhoodKey } from '../cash/neighborhood-key';
import { formatDayMonth } from '../history/date-keys';

/** Uma linha da lista da aba Fiado: quem deve ou quem quitou (2026-11-01). */
export interface FiadoClientRow {
  customerId: number;
  name: string;
  phone: string | null;
  total: Money;
  /** O que vem embaixo do nome. */
  details: string[];
}

/**
 * A busca da aba Fiado: o nome sem acento e sem maiúscula, ou parte do telefone (só os dígitos).
 *
 * @example matchesDebtor(jose, 'jose') // true
 */
export function matchesDebtor(
  debtor: Pick<FiadoDebtor, 'name' | 'phone'>,
  query: string,
): boolean {
  const key = toNeighborhoodKey(query);
  if (!key) return true;
  if (toNeighborhoodKey(debtor.name).includes(key)) return true;
  const digits = phoneDigits(query);
  return digits.length > 0 && (debtor.phone ?? '').includes(digits);
}

/**
 * A previsão mais próxima dos pedidos em aberto: atrasado (antes da noite), hoje, a data, ou
 * sem data quando nenhum pedido tem.
 *
 * @example nextDueText(maria, '2026-10-26') // 'atrasado desde 22/10'
 */
export function nextDueText(debtor: FiadoDebtor, today: string): string {
  const dates = debtor.orders
    .map((order) => order.dueDate)
    .filter((date): date is string => date !== null)
    .sort();
  const [first] = dates;
  if (!first) return 'sem data';
  if (first < today) return `atrasado desde ${formatDayMonth(first)}`;
  if (first === today) return 'pagar hoje';
  return `pagar em ${formatDayMonth(first)}`;
}

/** @example ordersCountText(2) // '2 pedidos' */
export function ordersCountText(count: number): string {
  return count === 1 ? '1 pedido' : `${count} pedidos`;
}

/**
 * Quem deve na lista: o total em aberto, o telefone, os pedidos e a previsão.
 *
 * @example debtorRow(maria, '2026-10-26').total // '47.00'
 */
export function debtorRow(debtor: FiadoDebtor, today: string): FiadoClientRow {
  const details = [
    debtor.phone,
    ordersCountText(debtor.orders.length),
    nextDueText(debtor, today),
  ];
  return {
    customerId: debtor.customerId,
    name: debtor.name,
    phone: debtor.phone,
    total: debtor.openTotal,
    details: details.filter((text) => text !== null),
  };
}

/**
 * Quem quitou na lista: o total dos pedidos, o telefone, os pedidos e a noite do pagamento.
 *
 * @example settledRow(alemao).details // ['1 pedido', 'pago em 01/11']
 */
export function settledRow(customer: FiadoSettledCustomer): FiadoClientRow {
  const paidOn = customer.lastPaidOn
    ? `pago em ${formatDayMonth(customer.lastPaidOn)}`
    : null;
  const details = [
    customer.phone,
    ordersCountText(customer.ordersCount),
    paidOn,
  ];
  return {
    customerId: customer.customerId,
    name: customer.name,
    phone: customer.phone,
    total: customer.paidTotal,
    details: details.filter((text) => text !== null),
  };
}
