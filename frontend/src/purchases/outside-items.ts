import type { InvoiceItem } from '../api/invoice-types';
import { centsToMoney, moneyToCents } from '../api/money';
import type { Money } from '../api/types';

/**
 * Itens da nota fora da lanchonete (pedido do usuário, 2026-10-25): pão de forma, massa de
 * tomate e outras compras de casa no mesmo cupom. Saem do valor do gasto e de Compras → Preços.
 */

/** As marcas de uma nota: as posições de fora e a soma dessas linhas, em centavos. */
export interface OutsideMarks {
  positions: number[];
  cents: number;
}

/**
 * @example outsideMarksOf(items, [9, 10]) // { positions: [9, 10], cents: 978 }
 */
export function outsideMarksOf(
  items: InvoiceItem[],
  positions: number[],
): OutsideMarks {
  const chosen = new Set(positions);
  const cents = items
    .filter((item) => chosen.has(item.position))
    .reduce((sum, item) => sum + moneyToCents(item.total), 0);
  return { positions, cents };
}

/** As posições que a nota gravada marcou (a da prévia vem sem a marca: nenhuma). */
export function savedOutsidePositions(items: InvoiceItem[]): number[] {
  return items
    .filter((item) => item.outsideBusiness)
    .map((item) => item.position);
}

/** @example toggledPositions([2, 9], 5) // [2, 5, 9] */
export function toggledPositions(
  positions: number[],
  position: number,
): number[] {
  if (positions.includes(position))
    return positions.filter((p) => p !== position);
  return [...positions, position].sort((a, b) => a - b);
}

/**
 * O "a pagar" da nota menos os itens de fora (nunca abaixo de zero).
 *
 * @example businessAmountOf('447.26', 1467) // '432.59'
 */
export function businessAmountOf(
  amountDue: Money,
  outsideCents: number,
): Money {
  return centsToMoney(Math.max(0, moneyToCents(amountDue) - outsideCents));
}

/** @example outsideLabel(3) // '3 fora' */
export function outsideLabel(count: number): string {
  return `${count} fora`;
}
