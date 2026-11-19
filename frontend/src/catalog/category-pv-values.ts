import { toApiDecimal } from '../api/quantity';
import type { ProductCategory } from '../api/types';
import type { Parsed } from './catalog-values';

const MAX_PERCENT_DECIMALS = 2;

export interface CategoryPercentages {
  fixedCostPercent: string | null;
  profitPercent: string | null;
}

/**
 * Percentual de 0 a 100 com até 2 casas (vírgula ou ponto) no formato da API.
 *
 * @example parsePercentValue('41,07', 'Custo fixo') // { ok: true, value: '41.07' }
 */
export function parsePercentValue(raw: string, label: string): Parsed<string> {
  const decimal = toApiDecimal(raw, MAX_PERCENT_DECIMALS);
  if (decimal === null) {
    return {
      ok: false,
      error: `${label} inválido "${raw}": esperado número de 0 a 100 com até ${MAX_PERCENT_DECIMALS} casas (ex.: 41,07)`,
    };
  }
  const numeric = Number(decimal);
  if (numeric < 0 || numeric > 100) {
    return {
      ok: false,
      error: `${label} inválido "${raw}": esperado valor de 0 a 100`,
    };
  }
  return { ok: true, value: decimal };
}

/**
 * Valida os percentuais de PV da categoria: os dois preenchidos ou os dois vazios.
 *
 * @example parseCategoryPercentages('41,07', '16') // { ok: true, value: { fixedCostPercent: '41.07', profitPercent: '16' } }
 * @example parseCategoryPercentages('', '') // { ok: true, value: { fixedCostPercent: null, profitPercent: null } }
 */
export function parseCategoryPercentages(
  fixedCostRaw: string,
  profitRaw: string,
): Parsed<CategoryPercentages> {
  const fixed = fixedCostRaw.trim();
  const profit = profitRaw.trim();
  if (!fixed && !profit) {
    return { ok: true, value: { fixedCostPercent: null, profitPercent: null } };
  }
  if (!fixed || !profit) {
    return {
      ok: false,
      error:
        'Informe os dois percentuais (custo fixo e lucro) ou deixe ambos vazios',
    };
  }
  const parsedFixed = parsePercentValue(fixed, 'Custo fixo');
  if (!parsedFixed.ok) return parsedFixed;
  const parsedProfit = parsePercentValue(profit, 'Lucro desejado');
  if (!parsedProfit.ok) return parsedProfit;
  return {
    ok: true,
    value: {
      fixedCostPercent: parsedFixed.value,
      profitPercent: parsedProfit.value,
    },
  };
}

/**
 * Formata os percentuais de PV para a lista de categorias.
 *
 * @example formatCategoryPv({ fixedCostPercent: '41.07', profitPercent: '16' }) // '41,07% + 16%'
 * @example formatCategoryPv({ fixedCostPercent: null, profitPercent: null }) // 'sem PV'
 */
export function formatCategoryPv(
  category: Pick<ProductCategory, 'fixedCostPercent' | 'profitPercent'>,
): string {
  const { fixedCostPercent, profitPercent } = category;
  if (!fixedCostPercent || !profitPercent) return 'sem PV';
  const fixed = fixedCostPercent.replace('.', ',');
  const profit = profitPercent.replace('.', ',');
  return `${fixed}% + ${profit}%`;
}
