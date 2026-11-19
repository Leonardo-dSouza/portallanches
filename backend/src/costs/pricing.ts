import { formatCents } from '../common/money.js';
import { ratioPercent, toScaled } from '../products/cmv.js';

/** Centavos em BigInt (contas exatas) no formato `'25.50'`; cabem com folga em `Number`. */
const formatBigCents = (cents: bigint): string => formatCents(Number(cents));

/**
 * Sobe para o próximo múltiplo de R$ 0,10 o valor `numerator ÷ divisor` arredondado antes para o
 * centavo (meio centavo sobe). Pedido do usuário (2026-11-18): 8,32 ÷ 0,4893 = 17,0039 é R$ 17,00,
 * e só vai a 17,10 quando os centavos não fecham em 10.
 *
 * @example roundedUpToTenCents(832n * 10000n, 4893n) // 1700n (centavos)
 */
function roundedUpToTenCents(numerator: bigint, divisor: bigint): bigint {
  const cents = (numerator * 2n + divisor) / (2n * divisor);
  return ((cents + 9n) / 10n) * 10n;
}

/**
 * Preço de venda sugerido para atingir o lucro desejado sobre o CMV: arredondado para o centavo e
 * depois para cima no próximo múltiplo de R$ 0,10.
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
  // centavos = cmvCents ÷ (divisor ÷ 10⁴)
  return formatBigCents(
    roundedUpToTenCents(toScaled(cmv, 2) * 10000n, divisor),
  );
}

/**
 * Preço de venda sugerido no iFood considerando custos fixos, margem iFood e comissão,
 * arredondado para o centavo e depois para cima no próximo múltiplo de R$ 0,10.
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
  // centavos = cmvCents ÷ (divisor ÷ 10⁸)
  const numerator = toScaled(cmv, 2) * 100000000n;
  return formatBigCents(roundedUpToTenCents(numerator, divisor));
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

/** Lucro sem truncar, em centésimos de centavo (preço × (100% − fixo) − CMV). */
function exactProfitScaled(
  salePrice: string,
  cmv: string,
  fixedCostPercent: string,
): bigint {
  const fixedScaled = toScaled(fixedCostPercent, 2);
  return (
    toScaled(salePrice, 2) * (10000n - fixedScaled) - toScaled(cmv, 2) * 10000n
  );
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
  // Compara em centésimos de centavo para não perder precisão no truncamento
  const targetScaled = toScaled(salePrice, 2) * toScaled(profitPercent, 2);
  return exactProfitScaled(salePrice, cmv, fixedCostPercent) < targetScaled;
}

/**
 * Folga da meta (2026-11-18, pedido do usuário): o cardápio muda pouco e corrigir centavos não é
 * natural, então só avisa quando o lucro cai mais de 2 pontos abaixo da meta.
 */
export const TARGET_TOLERANCE_POINTS = '2';

/** Na meta, perto da meta (até a folga abaixo) ou abaixo da meta (mais que a folga). */
export type TargetStatus = 'ok' | 'near' | 'below';

/**
 * Estado do lucro do preço do cardápio contra a meta, com a folga de 2 pontos.
 *
 * @example targetStatusFor('17.60', '7.68', '41.07', '16') // 'near' (15,3%)
 */
export function targetStatusFor(
  salePrice: string,
  cmv: string,
  fixedCostPercent: string,
  profitPercent: string,
): TargetStatus {
  if (!isBelowTarget(salePrice, cmv, fixedCostPercent, profitPercent))
    return 'ok';
  const floorScaled =
    toScaled(profitPercent, 2) - toScaled(TARGET_TOLERANCE_POINTS, 2);
  const floorProfit = toScaled(salePrice, 2) * floorScaled;
  const profit = exactProfitScaled(salePrice, cmv, fixedCostPercent);
  return profit < floorProfit ? 'below' : 'near';
}
