import { toCents } from '../common/money.js';
import { normalizeDecimal, toMilli } from '../common/quantity.js';

/** Custo guardado com 4 casas (mesma precisão de `supplies.unit_cost`). */
const COST_SCALE = 10_000;

/** Divide em inteiros, arredondando metade para cima (sem float no resultado final). */
function roundedRatio(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

/**
 * Custo por unidade de contagem a partir do valor pago (R$, 2 casas) por `quantity`
 * unidades de contagem. Fardo de 6 a R$ 25,00 → R$ 4,1667 por un.
 *
 * @example unitCostFromPaid('25.00', '6') // '4.1667'
 */
export function unitCostFromPaid(paid: string, quantity: string): string {
  const quantityMilli = toMilli(quantity);
  if (quantityMilli <= 0)
    throw new Error(
      `Quantidade ${quantity} inválida para calcular custo: esperado maior que zero`,
    );
  // centavos → décimos de milésimo de real (×100) e milésimos de unidade (×1000).
  const scaled = roundedRatio(toCents(paid) * 100 * 1000, quantityMilli);
  const integer = Math.floor(scaled / COST_SCALE);
  const decimals = String(scaled % COST_SCALE).padStart(4, '0');
  return normalizeDecimal(`${integer}.${decimals}`, 4) ?? '0';
}
