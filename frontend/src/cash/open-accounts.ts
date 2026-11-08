import { centsToMoney, moneyToCents } from '../api/money';
import type { Money, Order } from '../api/types';
import { isCanceled, isOpenAccount } from './order-filters';

/**
 * As contas A pagar da noite que ainda seguram o fechamento: balcão sem forma e não cancelado
 * (o backend recusa fechar com elas; card 8, 2026-11-08).
 *
 * @example openAccountsOf(day.orders).map((o) => o.dayNumber) // [3, 7]
 */
export function openAccountsOf(orders: Order[]): Order[] {
  return orders.filter((order) => !isCanceled(order) && isOpenAccount(order));
}

/**
 * Quantas contas A pagar e quanto somam, para o topo do caixa.
 *
 * @example openAccountsSummary(day.orders) // { count: 2, total: '35.20' }
 */
export function openAccountsSummary(orders: Order[]): {
  count: number;
  total: Money;
} {
  const open = openAccountsOf(orders);
  const cents = open.reduce((sum, o) => sum + moneyToCents(o.amount), 0);
  return { count: open.length, total: centsToMoney(cents) };
}
