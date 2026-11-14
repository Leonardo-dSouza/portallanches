import { normalizeDecimal } from '../common/quantity.js';

const COST_SCALE = 4;
const COST_SCALE_FACTOR = 10_000n;
const QUANTITY_SCALE = 3;

/** Alerta de preço pago em comparação com o custo base do insumo. */
export interface PriceAlert {
  paidPerUnit: string;
  basePerUnit: string;
  diffPercent: string;
  above: boolean;
}

/** Converte texto decimal em BigInt fixando a quantidade de casas decimais. */
function parseToScale(decimal: string, scale: number): bigint {
  const [integerPart, decimals = ''] = decimal.split('.');
  return BigInt(integerPart + decimals.slice(0, scale).padEnd(scale, '0'));
}

/** Calcula o valor pago por unidade em centésimos de milésimo (escala 4) arredondando meio sobe. */
function computePaidScaled(unitPrice: string, baseQuantity: string): bigint {
  const qtyScaled = parseToScale(baseQuantity, QUANTITY_SCALE);
  if (qtyScaled <= 0n) {
    throw new Error(
      `Quantidade base ${baseQuantity} inválida: esperado maior que zero`,
    );
  }
  const priceScaled = parseToScale(unitPrice, COST_SCALE);
  return (2n * priceScaled * 1000n + qtyScaled) / (2n * qtyScaled);
}

/** Converte inteiro escalado para texto decimal com até 4 casas sem float. */
function formatPaidCost(scaled: bigint): string {
  const integerPart = scaled / COST_SCALE_FACTOR;
  const decimals = String(scaled % COST_SCALE_FACTOR).padStart(COST_SCALE, '0');
  return normalizeDecimal(`${integerPart}.${decimals}`, COST_SCALE) ?? '0';
}

/** Calcula a diferença percentual com 1 casa decimal e sinal. */
function computeDiffPercent(paidScaled: bigint, baseScaled: bigint): string {
  const diff = paidScaled - baseScaled;
  const isNegative = diff < 0n;
  const absDiff = isNegative ? -diff : diff;
  const permille = (absDiff * 2000n + baseScaled) / (2n * baseScaled);
  if (permille === 0n) return '0.0';
  const text = permille.toString().padStart(2, '0');
  const formatted = `${text.slice(0, -1)}.${text.slice(-1)}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Calcula o alerta de preço comparando o valor unitário pago com o custo base do insumo.
 * Devolve null se não houver custo base cadastrado.
 *
 * @example priceAlert('45.79', '36', '1.2444') // { paidPerUnit: '1.2719', basePerUnit: '1.2444', diffPercent: '2.2', above: true }
 */
export function priceAlert(
  unitPrice: string,
  baseQuantity: string,
  baseUnitCost: string | null,
): PriceAlert | null {
  if (baseUnitCost === null) return null;
  const baseScaled = parseToScale(baseUnitCost, COST_SCALE);
  if (baseScaled <= 0n) return null;
  const paidScaled = computePaidScaled(unitPrice, baseQuantity);
  const paidPerUnit = formatPaidCost(paidScaled);
  const diffPercent = computeDiffPercent(paidScaled, baseScaled);
  return {
    paidPerUnit,
    basePerUnit: baseUnitCost,
    diffPercent,
    above: paidScaled > baseScaled,
  };
}
