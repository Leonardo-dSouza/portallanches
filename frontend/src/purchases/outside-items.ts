import type { InvoiceItem } from '../api/invoice-types';
import { centsToMoney, moneyToCents } from '../api/money';
import type { Money } from '../api/types';

/**
 * Itens da nota fora da lanchonete (pedido do usuário, 2026-10-25): pão de forma, massa de
 * tomate e outras compras de casa no mesmo cupom. Saem do valor do gasto e de Compras → Preços.
 */

/** As marcas de uma nota: as posições de fora, o valor líquido em centavos e a divisão do desconto. */
export interface OutsideMarks {
  positions: number[];
  /** Valor líquido dos itens de fora (com desconto abatido, 2026-11-08). */
  cents: number;
  /** Valor cheio dos itens de fora, sem o desconto. */
  grossCents: number;
  /** Quanto do desconto ficou para a lanchonete. */
  businessDiscount: Money;
}

export interface InvoiceSplitInput {
  amountDueCents: number;
  outsideGrossCents: number;
  discountCents: number;
  businessDiscountCents: number;
}

export interface InvoiceSplit {
  outsideNetCents: number;
  businessCents: number;
}

/**
 * Divide o valor da nota entre compras de fora e lanchonete atribuindo o desconto
 * (pedido do usuário, 2026-11-08): foraLíquido = foraCheio - (desconto - descontoDaLanchonete);
 * daLanchonete = aPagar - foraLíquido. Sempre em centavos inteiros.
 *
 * @example calculateInvoiceSplit({ amountDueCents: 4314, outsideGrossCents: 2856, discountCents: 719, businessDiscountCents: 0 })
 * // { outsideNetCents: 2137, businessCents: 2177 }
 */
export function calculateInvoiceSplit(input: InvoiceSplitInput): InvoiceSplit {
  const {
    amountDueCents,
    outsideGrossCents,
    discountCents,
    businessDiscountCents,
  } = input;
  if (outsideGrossCents === 0) {
    return { outsideNetCents: 0, businessCents: amountDueCents };
  }
  const outsideDiscount = discountCents - businessDiscountCents;
  const outsideNetCents = outsideGrossCents - outsideDiscount;
  const businessCents = amountDueCents - outsideNetCents;
  return { outsideNetCents, businessCents };
}

export interface OutsideMarksInput {
  items: InvoiceItem[];
  positions: number[];
  discount?: Money;
  businessDiscount?: Money;
  amountDue?: Money;
}

/**
 * Calcula as marcas e a divisão do valor da nota (pedido do usuário, 2026-11-08).
 *
 * @example outsideMarksOf({ items, positions: [9, 10] }) // { positions: [9, 10], cents: 978, grossCents: 978, businessDiscount: '0.00' }
 */
export function outsideMarksOf(input: OutsideMarksInput): OutsideMarks {
  const {
    items,
    positions,
    discount = '0.00',
    businessDiscount = discount,
    amountDue = '0.00',
  } = input;
  const chosen = new Set(positions);
  const grossCents = items
    .filter((item) => chosen.has(item.position))
    .reduce((sum, item) => sum + moneyToCents(item.total), 0);
  const split = calculateInvoiceSplit({
    amountDueCents: moneyToCents(amountDue),
    outsideGrossCents: grossCents,
    discountCents: moneyToCents(discount),
    businessDiscountCents: moneyToCents(businessDiscount),
  });
  return {
    positions,
    cents: split.outsideNetCents,
    grossCents,
    businessDiscount,
  };
}

/** As posições que a nota gravada marcou (a da prévia vem sem a marca: nenhuma). */
export function savedOutsidePositions(items: InvoiceItem[]): number[] {
  return items
    .filter((item) => item.outsideBusiness)
    .map((item) => item.position);
}

/**
 * Troca a marca de uma linha da tela, que pode juntar várias da nota (2026-10-30).
 *
 * @example toggledPositions([2, 9], [5, 6]) // [2, 5, 6, 9]
 */
export function toggledPositions(
  positions: number[],
  group: number[],
): number[] {
  if (group.every((position) => positions.includes(position)))
    return positions.filter((position) => !group.includes(position));
  return [...new Set([...positions, ...group])].sort((a, b) => a - b);
}

/**
 * O "a pagar" da nota menos os itens de fora líquidos (nunca abaixo de zero).
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
