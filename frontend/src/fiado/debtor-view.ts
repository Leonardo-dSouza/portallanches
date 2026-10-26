import type { FiadoDebtor } from '../api/fiado-types';
import { phoneDigits } from '../cash/customer-draft';
import { toNeighborhoodKey } from '../cash/neighborhood-key';
import { formatDayMonth } from '../history/date-keys';

/**
 * A busca da aba Fiado: o nome sem acento e sem maiúscula, ou parte do telefone (só os dígitos).
 *
 * @example matchesDebtor(jose, 'jose') // true
 */
export function matchesDebtor(debtor: FiadoDebtor, query: string): boolean {
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
