import { formatCents } from '../common/money.js';
import { ratioPercent, toScaled } from '../products/cmv.js';

/** Centavos em BigInt (contas exatas) no formato `'25.50'`; cabem com folga em `Number`. */
const formatBigCents = (cents: bigint): string => formatCents(Number(cents));

/**
 * Preço de venda sugerido para atingir o lucro desejado sobre o CMV,
 * arredondado para cima no próximo múltiplo de R$ 0,10.
 * Devolve null se a soma das margens for maior ou igual a 100%.
 *
 * @example pvFor('7.68', '41.07', '16') // '17.90'
 */
export function pvFor(
  cmv: string,
  fixedCostPercent: string,
  profitPercent: string,
): string | null {
  const divisor =
    10000n - toScaled(fixedCostPercent, 2) - toScaled(profitPercent, 2);
  if (divisor <= 0n) return null;
  // Unidades de 10 centavos com teto exato: ceil(cmvCents * 1000 / divisor)
  const numerator = toScaled(cmv, 2) * 1000n;
  const units = (numerator + divisor - 1n) / divisor;
  return formatBigCents(units * 10n);
}

/**
 * Preço de venda sugerido no iFood considerando custos fixos, margem iFood e comissão,
 * arredondado para cima no próximo múltiplo de R$ 0,10.
 * Devolve null se qualquer divisor for menor ou igual a zero.
 *
 * @example ifoodPvFor('15.19', '41.07', '10', '28') // '43.20'
 */
export function ifoodPvFor(
  cmv: string,
  fixedCostPercent: string,
  ifoodProfitPercent: string,
  commissionPercent: string,
): string | null {
  const marginDivisor =
    10000n - toScaled(fixedCostPercent, 2) - toScaled(ifoodProfitPercent, 2);
  const commissionDivisor = 10000n - toScaled(commissionPercent, 2);
  if (marginDivisor <= 0n || commissionDivisor <= 0n) return null;
  const divisor = marginDivisor * commissionDivisor;
  // Unidades de 10 centavos: ceil(cmvCents * 10^7 / divisor)
  const numerator = toScaled(cmv, 2) * 10000000n;
  const units = (numerator + divisor - 1n) / divisor;
  return formatBigCents(units * 10n);
}

/**
 * Lucro em reais (LRD: preço - custo fixo - CMV), truncado no centavo em direção a zero.
 * Pode resultar em valor negativo quando os custos superam o preço.
 *
 * @example profitFor('17.60', '7.68', '41.07') // '2.69'
 */
export function profitFor(
  salePrice: string,
  cmv: string,
  fixedCostPercent: string,
): string {
  const priceCents = toScaled(salePrice, 2);
  const cmvCents = toScaled(cmv, 2);
  const fixedScaled = toScaled(fixedCostPercent, 2);
  // Divisão inteira trunca em direção a zero (TRUNC do Excel)
  const profitScaled = priceCents * (10000n - fixedScaled) - cmvCents * 10000n;
  return formatBigCents(profitScaled / 10000n);
}

/**
 * Margem de lucro como porcentagem do preço de venda com 1 casa decimal.
 * Devolve null quando o preço de venda é zero.
 *
 * @example marginPercent('2.69', '17.60') // '15.3'
 */
export function marginPercent(
  profit: string,
  salePrice: string,
): string | null {
  return ratioPercent(profit, salePrice);
}

/**
 * Informa se o lucro real (sem truncamento) fica abaixo da meta de lucro desejada.
 *
 * @example isBelowTarget('17.60', '7.68', '41.07', '16') // true
 */
export function isBelowTarget(
  salePrice: string,
  cmv: string,
  fixedCostPercent: string,
  profitPercent: string,
): boolean {
  const priceCents = toScaled(salePrice, 2);
  const cmvCents = toScaled(cmv, 2);
  const fixedScaled = toScaled(fixedCostPercent, 2);
  const profitScaled = toScaled(profitPercent, 2);
  // Compara em centésimos de centavo para não perder precisão no truncamento
  const actualProfitScaled =
    priceCents * (10000n - fixedScaled) - cmvCents * 10000n;
  const targetProfitScaled = priceCents * profitScaled;
  return actualProfitScaled < targetProfitScaled;
}
