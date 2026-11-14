import type { RecipeItem } from '../api/cost-types';
import { centsToMoney } from '../api/money';
import { toApiQuantity } from '../api/quantity';

const COST_SCALE = 4;
const QUANTITY_SCALE = 3;
const SCALE_DIVISOR = 100_000n; // 10^(4 + 3 - 2) para converter em centavos inteiros

function toScaled(decimal: string, scale: number): bigint {
  const [integerPart, decimals = ''] = decimal.split('.');
  return BigInt(integerPart + decimals.padEnd(scale, '0'));
}

/**
 * Atualiza a quantidade de um insumo específico na lista de ingredientes.
 *
 * @example updateIngredientQuantity([{ supplyId: 1, quantity: '1' }], 1, '2')
 */
export function updateIngredientQuantity(
  items: RecipeItem[],
  supplyId: number,
  quantity: string,
): RecipeItem[] {
  const index = items.findIndex((item) => item.supplyId === supplyId);
  if (index === -1) return items;
  return items.map((item) =>
    item.supplyId === supplyId ? { ...item, quantity } : item,
  );
}

/**
 * Remove um insumo da lista de ingredientes da ficha técnica.
 *
 * @example removeIngredientItem([{ supplyId: 1, quantity: '1' }], 1)
 */
export function removeIngredientItem(
  items: RecipeItem[],
  supplyId: number,
): RecipeItem[] {
  return items.filter((item) => item.supplyId !== supplyId);
}

/**
 * Adiciona um insumo à lista com quantidade padrão 1, evitando duplicações.
 *
 * @example addIngredientItem([], 3)
 */
export function addIngredientItem(
  items: RecipeItem[],
  supplyId: number,
  defaultQuantity: string = '1',
): RecipeItem[] {
  const exists = items.some((item) => item.supplyId === supplyId);
  if (exists) return items;
  return [...items, { supplyId, quantity: defaultQuantity }];
}

/**
 * Valida e converte a quantidade digitada para formato da API; rejeita zero, vazia e não-números.
 *
 * @example parseValidQuantity('1,5') // '1.5'
 */
export function parseValidQuantity(typed: string): string | null {
  const normalized = toApiQuantity(typed);
  if (!normalized) return null;
  const numeric = Number(normalized);
  if (numeric <= 0 || !Number.isFinite(numeric)) return null;
  return normalized;
}

/**
 * Calcula o subtotal quantidade × custo sem float, arredondando para o centavo mais próximo.
 *
 * @example computeIngredientSubtotal('0.036', '39.9000') // '1.44'
 */
export function computeIngredientSubtotal(
  quantity: string,
  unitCost: string | null,
): string | null {
  if (unitCost === null) return null;
  // Conta em BigInt com escalas fixas para evitar imprecisão de float
  const scaledQty = toScaled(quantity, QUANTITY_SCALE);
  const scaledCost = toScaled(unitCost, COST_SCALE);
  const cents = (scaledQty * scaledCost + SCALE_DIVISOR / 2n) / SCALE_DIVISOR;
  return centsToMoney(Number(cents));
}
