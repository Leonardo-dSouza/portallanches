import type { ProductCostView } from '../api/cost-types';
import { formatAmount, formatMoney, moneyToCents } from '../api/money';
import { formatPercentText, gapPoints, unroundedPv } from './price-split';

/*
 * Frases da aba da categoria (2026-11-18). O estado (na meta, perto, abaixo) vem da API; aqui só se
 * escreve. A folga de 2 pontos é do backend (TARGET_TOLERANCE_POINTS) e aparece só no texto.
 */

/** Margem com 1 casa e vírgula, como a planilha: '9.0' → '9,0%'. */
const marginText = (margin: string) => `${margin.replace('.', ',')}%`;

/**
 * Linha de baixo do lucro na tabela; null sem preço.
 *
 * @example profitLine(xBurguer) // '9,0% · perto da meta de 10%'
 */
export function profitLine(view: ProductCostView): string | null {
  if (view.marginPercent === null) return null;
  const margin = marginText(view.marginPercent);
  const target = view.profitTarget && formatPercentText(view.profitTarget);
  if (view.targetStatus === 'near')
    return `${margin} · perto da meta de ${target}%`;
  if (view.targetStatus === 'below')
    return `${margin} · abaixo da meta de ${target}%`;
  return `${margin} do preço`;
}

/** Coluna "Preço sugerido": igual ao cardápio, ou o PV e a diferença para o preço de hoje. */
export type SuggestedPrice =
  { same: true } | { same: false; price: string; diff: string | null };

/**
 * O que a coluna do preço sugerido mostra; null sem PV (categoria sem meta).
 *
 * @example suggestedPrice(xSalada) // { same: false, price: 'R$ 17,90', diff: '+ 0,30' }
 */
export function suggestedPrice(view: ProductCostView): SuggestedPrice | null {
  if (view.pv === null) return null;
  const price = formatMoney(view.pv);
  if (view.salePrice === null) return { same: false, price, diff: null };
  const cents = moneyToCents(view.pv) - moneyToCents(view.salePrice);
  if (cents === 0) return { same: true };
  const amount = formatAmount((Math.abs(cents) / 100).toFixed(2));
  return { same: false, price, diff: `${cents > 0 ? '+' : '−'} ${amount}` };
}

function pointsText(points: string): string {
  const plural = Number(points.replace(',', '.')) >= 2;
  return `${points} ${plural ? 'pontos' : 'ponto'}`;
}

/**
 * O passo 4 da conta: o lucro do preço de hoje contra a meta, com a folga.
 *
 * @example statusSentence(xBurguer) // '9,0% do preço: 1 ponto abaixo da meta de 10%, dentro da folga de 2 pontos.'
 */
export function statusSentence(view: ProductCostView): string | null {
  const { marginPercent, profitTarget, targetStatus } = view;
  if (marginPercent === null || profitTarget === null || targetStatus === null)
    return null;
  const head = `${marginText(marginPercent)} do preço`;
  const target = `meta de ${formatPercentText(profitTarget)}%`;
  if (targetStatus === 'ok') return `${head}: na ${target}.`;
  const gap = pointsText(gapPoints(marginPercent, profitTarget));
  if (targetStatus === 'near')
    return `${head}: ${gap} abaixo da ${target}, dentro da folga de 2 pontos.`;
  return `${head}: ${gap} abaixo da ${target}. Vale rever o preço em Cadastros.`;
}

/** Quociente para mostrar: 2 casas, ou 4 quando as 2 já parecem redondas e o PV ainda sobe. */
function quotientText(quotient: string): string {
  const [whole, fraction] = quotient.split('.');
  const twoPlaces = `${whole}.${fraction.slice(0, 2)}`;
  const looksRound = fraction[1] === '0' && fraction.slice(2) !== '00';
  return looksRound ? quotient : twoPlaces;
}

/**
 * O passo 3 da conta: custo ÷ divisor, e se o resultado sobe para os próximos 10 centavos.
 *
 * @example quotientSentence('8.48', '0.4893', '17.40') // 'R$ 8,48 ÷ 0,4893 = R$ 17,33, que sobe para os próximos 10 centavos'
 */
export function quotientSentence(
  cmv: string,
  divisor: string,
  pv: string,
): string {
  const quotient = unroundedPv(cmv, divisor);
  const head = `${formatMoney(cmv)} ÷ ${divisor.replace('.', ',')}`;
  // Divisão exata (as casas 3 e 4 zeradas e igual ao PV): nada sobe.
  const exact =
    quotient.endsWith('00') && moneyToCents(quotient) === moneyToCents(pv);
  if (exact) return `${head} = ${formatMoney(pv)}`;
  const shown = formatMoney(quotientText(quotient));
  return `${head} = ${shown}, que sobe para os próximos 10 centavos`;
}
