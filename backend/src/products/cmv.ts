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

/** Decimal normalizado ('0.036') em inteiro com `scale` casas implícitas, sem float. */
function toScaled(decimal: string, scale: number): bigint {
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
 * CMV como porcentagem do preço de venda, com 1 casa (a planilha mira 42%).
 * Null quando não há preço (ou ele é zero).
 *
 * @example cmvPercent('7.42', '17.80') // '41.7'
 */
export function cmvPercent(
  cmv: string,
  salePrice: string | null,
): string | null {
  if (salePrice === null) return null;
  const priceCents = toScaled(salePrice, 2);
  if (priceCents === 0n) return null;
  const permille = (toScaled(cmv, 2) * 2000n + priceCents) / (2n * priceCents);
  const text = permille.toString().padStart(2, '0');
  return `${text.slice(0, -1)}.${text.slice(-1)}`;
}
