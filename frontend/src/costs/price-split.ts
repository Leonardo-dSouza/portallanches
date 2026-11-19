import type { ProductCostView } from '../api/cost-types';
import { centsToMoney, moneyToCents } from '../api/money';

/*
 * Contas só de exibição da tela de Custos (2026-11-18). As regras de preço (PV, lucro, estado da
 * meta) vêm prontas da API; aqui só se reparte o que ela mandou para desenhar a régua, a barra e
 * os passos da conta, sem decidir nada.
 */

/** Percentual com 2 casas em centésimos de ponto: '41.07' → 4107. */
function hundredthsOf(percent: string): number {
  const [whole, decimals = ''] = percent.split('.');
  const sign = whole.startsWith('-') ? -1 : 1;
  const magnitude =
    Math.abs(Number(whole)) * 100 + Number(decimals.padEnd(2, '0').slice(0, 2));
  return sign * magnitude;
}

/**
 * O que sobra do preço para os insumos (o fator divisor da planilha), com 4 casas.
 *
 * @example divisorOf('41.07', '16') // '0.4293'
 */
export function divisorOf(
  fixedCostPercent: string,
  profitPercent: string,
): string {
  const left =
    10000 - hundredthsOf(fixedCostPercent) - hundredthsOf(profitPercent);
  return (left / 10000).toFixed(4);
}

/** De cada R$ 10 que se cobra, quanto vai para cada parte (a régua da categoria). */
export interface PriceRuler {
  supplies: string;
  fixed: string;
  profit: string;
  /** Os mesmos 42,93% do divisor, em percentual. */
  suppliesPercent: string;
  divisor: string;
}

/**
 * Reparte R$ 10 entre insumos, custo fixo e lucro; os insumos ficam com o resto, para somar 10.
 *
 * @example rulerOf('41.07', '16') // { supplies: '4.29', fixed: '4.11', profit: '1.60', … }
 */
export function rulerOf(
  fixedCostPercent: string,
  profitPercent: string,
): PriceRuler {
  // R$ 10 = 1000 centavos; 1 ponto percentual de R$ 10 = 10 centavos.
  const fixedCents = Math.round(hundredthsOf(fixedCostPercent) / 10);
  const profitCents = Math.round(hundredthsOf(profitPercent) / 10);
  const divisor = divisorOf(fixedCostPercent, profitPercent);
  return {
    supplies: centsToMoney(1000 - fixedCents - profitCents),
    fixed: centsToMoney(fixedCents),
    profit: centsToMoney(profitCents),
    suppliesPercent: (Number(divisor) * 100).toFixed(2),
    divisor,
  };
}

/** Fatias da barra do lanche, em fração da largura (0 a 1). */
export interface PriceSplit {
  supplies: number;
  fixed: number;
  profit: number;
  /** O que o preço não cobre (lucro negativo); a barra passa a ser o custo total. */
  loss: number;
  /** Onde o lucro alcança a meta (fração do preço); null sem meta ou com prejuízo. */
  targetMark: number | null;
}

function lossSplit(price: number, cmv: number, profit: number): PriceSplit {
  const totalCost = price - profit;
  const coveredFixed = Math.max(0, price - cmv);
  const supplies = cmv / totalCost;
  const fixed = coveredFixed / totalCost;
  return {
    supplies,
    fixed,
    profit: 0,
    loss: 1 - supplies - fixed,
    targetMark: null,
  };
}

/**
 * Fatias do preço de hoje: insumos, custo fixo (preço − insumos − lucro) e lucro, com a marca da
 * meta. Com prejuízo, a barra é o custo total e o fim dela é o que falta. null sem preço.
 *
 * @example splitOf(xSalada) // { supplies: 0.436, fixed: 0.411, profit: 0.153, loss: 0, targetMark: 0.84 }
 */
export function splitOf(view: ProductCostView): PriceSplit | null {
  if (view.salePrice === null || view.profit === null) return null;
  const price = moneyToCents(view.salePrice);
  if (price <= 0) return null;
  const cmv = moneyToCents(view.cmv);
  const profit = moneyToCents(view.profit);
  if (profit < 0) return lossSplit(price, cmv, profit);
  const target = view.profitTarget;
  return {
    supplies: cmv / price,
    fixed: (price - cmv - profit) / price,
    profit: profit / price,
    loss: 0,
    targetMark: target === null ? null : 1 - hundredthsOf(target) / 10000,
  };
}

/**
 * Custo fixo em reais do preço de hoje: preço − insumos − lucro.
 *
 * @example fixedCostAmount(xSalada) // '7.23'
 */
export function fixedCostAmount(view: ProductCostView): string | null {
  if (view.salePrice === null || view.profit === null) return null;
  const cents =
    moneyToCents(view.salePrice) -
    moneyToCents(view.cmv) -
    moneyToCents(view.profit);
  return centsToMoney(cents);
}

/**
 * Custo ÷ divisor com 4 casas (truncado), antes de subir para os próximos 10 centavos: só para
 * mostrar a conta.
 *
 * @example unroundedPv('8.48', '0.4893') // '17.3308'
 */
export function unroundedPv(cmv: string, divisor: string): string {
  const divisorScaled = BigInt(Math.round(Number(divisor) * 10000));
  if (divisorScaled <= 0n) return '0.0000';
  // Centavos × 10⁶ ÷ (divisor × 10⁴) = décimos de milésimo de real.
  const tenThousandths = (BigInt(moneyToCents(cmv)) * 1000000n) / divisorScaled;
  const whole = tenThousandths / 10000n;
  const fraction = (tenThousandths % 10000n).toString().padStart(4, '0');
  return `${whole}.${fraction}`;
}

/**
 * Percentual com vírgula e sem zeros sobrando.
 *
 * @example formatPercentText('12.50') // '12,5'
 */
export function formatPercentText(percent: string): string {
  const [whole, decimals = ''] = percent.split('.');
  const trimmed = decimals.replace(/0+$/, '');
  return trimmed ? `${whole},${trimmed}` : whole;
}

/**
 * Quantos pontos o lucro do preço está abaixo da meta.
 *
 * @example gapPoints('15.3', '16') // '0,7'
 */
export function gapPoints(marginPercent: string, target: string): string {
  const gap = hundredthsOf(target) - hundredthsOf(marginPercent);
  return formatPercentText((gap / 100).toFixed(2));
}

function compareMenuOrder(a: ProductCostView, b: ProductCostView): number {
  if (a.menuNumber !== b.menuNumber) {
    if (a.menuNumber === null) return 1;
    if (b.menuNumber === null) return -1;
    return a.menuNumber - b.menuNumber;
  }
  return a.name.localeCompare(b.name, 'pt-BR');
}

/**
 * Lanches da categoria na ordem do cardápio; sem número (adicionais) por nome, no fim.
 *
 * @example sortForCategory(view.products, 1)
 */
export function sortForCategory(
  products: ProductCostView[],
  categoryId: number,
): ProductCostView[] {
  return products
    .filter((p) => p.categoryId === categoryId)
    .sort(compareMenuOrder);
}
