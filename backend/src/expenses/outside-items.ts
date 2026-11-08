import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { formatCents, toCents } from '../common/money.js';

/**
 * Itens da nota fora da lanchonete (pedido do usuário, 2026-10-25): pão de forma, massa de tomate
 * e outras compras de casa no mesmo cupom. Saem do valor do gasto e de Compras → Preços.
 */

/** A decisão gravada de um item: o código do produto no mercado e se ficou de fora. */
export interface OutsideDecision {
  code: string;
  outsideBusiness: boolean;
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

/**
 * Confere as posições marcadas contra a nota (itens 1 a N, como a SEFAZ numera). A nota inteira
 * de fora não é gasto da lanchonete: o caixa tira a nota ou desmarca um item.
 *
 * @example assertOutsidePositions([2], 3) // ok
 */
export function assertOutsidePositions(
  positions: number[],
  itemCount: number,
): void {
  const unknown = positions.find((p) => p > itemCount);
  if (unknown !== undefined)
    throw new BadRequestException(
      `Item ${unknown} não existe na nota (itens 1 a ${itemCount})`,
    );
  if (positions.length > 0 && positions.length >= itemCount)
    throw new UnprocessableEntityException(
      `A nota inteira está fora da lanchonete (${positions.length} de ${itemCount} itens): tire a nota do gasto ou desmarque um item`,
    );
}

/**
 * Confere se o desconto da lanchonete está na faixa permitida (2026-11-08):
 * o desconto dos itens de fora não pode ser maior que o valor cheio deles,
 * então vai de max(0, desconto - foraCheio) até o desconto total da nota.
 *
 * @example assertBusinessDiscountRange('5.00', '10.00', 500) // ok
 */
export function assertBusinessDiscountRange(
  businessDiscount: string,
  discount: string,
  outsideGrossCents: number = toCents(discount),
): void {
  const discountCents = toCents(discount);
  const businessDiscountCents = toCents(businessDiscount);
  const minCents = Math.max(0, discountCents - outsideGrossCents);
  if (
    businessDiscountCents >= minCents &&
    businessDiscountCents <= discountCents
  ) {
    return;
  }
  const minFormatted = formatCents(minCents);
  throw new BadRequestException(
    `Campo "businessDiscount" fora da faixa: recebido ${JSON.stringify(businessDiscount)}, esperado entre ${minFormatted} e ${discount}`,
  );
}

/**
 * Soma o valor cheio dos itens de fora em centavos inteiros (2026-11-08).
 *
 * @example outsideGrossCentsOf([{ position: 1, total: '5.00' }], [1]) // 500
 */
export function outsideGrossCentsOf(
  items: { position: number; total: string }[],
  positions: number[],
): number {
  const chosen = new Set(positions);
  return items
    .filter((item) => chosen.has(item.position))
    .reduce((sum, item) => sum + toCents(item.total), 0);
}

/**
 * Determina o desconto da lanchonete a gravar: sem itens de fora ou sem valor informado,
 * fica o desconto inteiro da nota (o comportamento padrão); caso contrário, valida a faixa.
 *
 * @example resolveBusinessDiscount([2], '0.00', '7.19', 1000) // '0.00'
 */
export function resolveBusinessDiscount(
  positions: number[],
  businessDiscount: string | undefined,
  discount: string,
  outsideGrossCents?: number,
): string {
  if (positions.length === 0 || businessDiscount === undefined) {
    return discount;
  }
  assertBusinessDiscountRange(businessDiscount, discount, outsideGrossCents);
  return businessDiscount;
}

/**
 * Marca de item sem nota no gasto (nenhuma lida, ou a nota sendo tirada) é erro do pedido.
 *
 * @example assertNoInvoiceMarks([]) // ok
 */
export function assertNoInvoiceMarks(positions: number[] | undefined): void {
  if (!positions?.length) return;
  throw new BadRequestException(
    `Campo "outsidePositions" sem nota: recebido ${JSON.stringify(positions)}, esperado nenhum item marcado num gasto sem nota fiscal`,
  );
}

/**
 * Desconto da lanchonete sem nota no gasto é erro do pedido.
 *
 * @example assertNoInvoiceDiscount(undefined) // ok
 */
export function assertNoInvoiceDiscount(discount: string | undefined): void {
  if (discount === undefined) return;
  throw new BadRequestException(
    `Campo "businessDiscount" sem nota: recebido ${JSON.stringify(discount)}, esperado apenas em gastos com nota fiscal`,
  );
}

/**
 * Códigos que a nota mais recente marcou como de fora ("lembrar" por mercado + código): a
 * lista vem da decisão mais nova para a mais antiga, e só a primeira de cada código vale.
 *
 * @example latestOutsideCodes([{ code: 'pao', outsideBusiness: true }]) // Set { 'pao' }
 */
export function latestOutsideCodes(decisions: OutsideDecision[]): Set<string> {
  const seen = new Set<string>();
  const outside = new Set<string>();
  for (const { code, outsideBusiness } of decisions) {
    if (seen.has(code)) continue;
    seen.add(code);
    if (outsideBusiness) outside.add(code);
  }
  return outside;
}

/**
 * As linhas da nota nova com código lembrado como de fora (todas as linhas do mesmo produto).
 *
 * @example suggestedOutsidePositions([{ position: 2, code: 'pao' }], new Set(['pao'])) // [2]
 */
export function suggestedOutsidePositions(
  items: { position: number; code: string }[],
  outsideCodes: Set<string>,
): number[] {
  return items
    .filter((item) => outsideCodes.has(item.code))
    .map((item) => item.position);
}
