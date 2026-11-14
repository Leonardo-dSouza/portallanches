import { formatCents } from '../common/money.js';

/** Quantidade (até 3 casas) × custo unitário (até 4 casas) = 7 casas; ÷ 10^5 vira centavos. */
const COST_SCALE = 4;
const QUANTITY_SCALE = 3;
const SCALED_PER_CENT = 10n ** BigInt(COST_SCALE + QUANTITY_SCALE - 2);

/** Componente como o CMV precisa: `unitCost` null = insumo sem custo cadastrado. */
export interface CostedComponent {
  quantity: string;
  unitCost: string | null;
}

export interface CmvResult {
  /** Soma em reais com 2 casas (`'7.42'`), arredondada para o centavo mais próximo. */
  cmv: string;
  /** False se algum insumo não tem custo: o CMV mostrado fica abaixo do real. */
  complete: boolean;
}

/**
 * Decimal normalizado ('0.036') em inteiro com `scale` casas implícitas, sem float.
 *
 * @example toScaled('0.036', 3) // 36n
 */
export function toScaled(decimal: string, scale: number): bigint {
  const [integerPart, decimals = ''] = decimal.split('.');
  return BigInt(integerPart + decimals.padEnd(scale, '0'));
}

/**
 * Custo da mercadoria vendida de um produto: Σ quantidade × custo unitário do insumo.
 * Arredonda só no fim (meio centavo sobe), como a planilha de custos.
 *
 * @example computeCmv([{ quantity: '0.036', unitCost: '39.9' }]) // { cmv: '1.44', complete: true }
 */
export function computeCmv(components: CostedComponent[]): CmvResult {
  let total = 0n;
  for (const component of components) {
    if (component.unitCost === null) continue;
    total +=
      toScaled(component.quantity, QUANTITY_SCALE) *
      toScaled(component.unitCost, COST_SCALE);
  }
  const cents = (total + SCALED_PER_CENT / 2n) / SCALED_PER_CENT;
  return {
    cmv: formatCents(Number(cents)),
    complete: components.every((c) => c.unitCost !== null),
  };
}

/**
 * Razão percentual de uma parte sobre o total com 1 casa decimal, com arredondamento padrão.
 * Preserva o zero à esquerda em valores negativos pequenos (ex.: -0.5 em vez de -.5).
 * Devolve null se o total for nulo ou zero.
 *
 * @example ratioPercent('7.42', '17.80') // '41.7'
 */
export function ratioPercent(
  part: string,
  total: string | null,
): string | null {
  if (total === null) return null;
  const totalCents = toScaled(total, 2);
  if (totalCents <= 0n) return null;
  const partCents = toScaled(part, 2);
  const isNegative = partCents < 0n;
  const absPartCents = isNegative ? -partCents : partCents;
  const permille = (absPartCents * 2000n + totalCents) / (2n * totalCents);
  if (permille === 0n) return '0.0';
  const text = permille.toString().padStart(2, '0');
  const formatted = `${text.slice(0, -1)}.${text.slice(-1)}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * CMV como porcentagem do preço de venda, com 1 casa (a planilha mira 42%).
 * Null quando não há preço (ou ele é zero).
 *
 * @example cmvPercent('7.42', '17.80') // '41.7'
 */
export function cmvPercent(
  cmv: string,
  salePrice: string | null,
): string | null {
  return ratioPercent(cmv, salePrice);
}
