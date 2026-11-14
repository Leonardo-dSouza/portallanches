import { normalizeDecimal } from '../common/quantity.js';
import { toScaled } from '../products/cmv.js';
import type { RecipeItem, SupplyRecipe } from './cost-types.js';

const QUANTITY_SCALE = 3;
const COST_SCALE = 4;
const COST_SCALE_FACTOR = 10_000n;

/** Resultado do cálculo do custo de uma ficha de produção. */
export interface RecipeCost {
  /** Custo unitário com até 4 casas decimais normalizadas (`'6.1936'`). */
  unitCost: string;
  /** Falso se algum ingrediente da ficha não possui custo cadastrado. */
  complete: boolean;
}

interface IngredientsCostSummary {
  totalCost: bigint;
  complete: boolean;
}

/** Valida e converte o rendimento da ficha para BigInt na escala de quantidade. */
function parseYield(yieldQuantity: string): bigint {
  const normalized = normalizeDecimal(yieldQuantity, QUANTITY_SCALE);
  if (normalized === null || toScaled(normalized, QUANTITY_SCALE) <= 0n) {
    throw new Error(
      `Rendimento ${yieldQuantity} inválido: esperado maior que zero`,
    );
  }
  return toScaled(normalized, QUANTITY_SCALE);
}

/** Soma a quantidade × custo unitário de cada ingrediente cadastrado. */
function sumIngredientsCost(
  items: RecipeItem[],
  unitCostOf: (supplyId: number) => string | null,
): IngredientsCostSummary {
  let totalCost = 0n;
  let complete = true;
  for (const item of items) {
    const cost = unitCostOf(item.supplyId);
    if (cost === null) {
      complete = false;
      continue;
    }
    totalCost +=
      toScaled(item.quantity, QUANTITY_SCALE) * toScaled(cost, COST_SCALE);
  }
  return { totalCost, complete };
}

/** Converte o valor escalado de volta para string decimal com 4 casas normalizadas. */
function formatScaledCost(scaled: bigint): string {
  const integerPart = scaled / COST_SCALE_FACTOR;
  const decimals = String(scaled % COST_SCALE_FACTOR).padStart(COST_SCALE, '0');
  return normalizeDecimal(`${integerPart}.${decimals}`, COST_SCALE) ?? '0';
}

/**
 * Calcula o custo unitário de uma ficha de produção (Σ ingredientes ÷ rendimento).
 * Arredonda só no fim (meio sobe) para 4 casas decimais. Ingrediente sem custo fica fora
 * da soma e marca `complete: false`.
 *
 * @example recipeUnitCost(burgerRecipe, () => '36.90') // { unitCost: '6.1936', complete: true }
 */
export function recipeUnitCost(
  recipe: SupplyRecipe,
  unitCostOf: (supplyId: number) => string | null,
): RecipeCost {
  const yieldScaled = parseYield(recipe.yieldQuantity);
  if (recipe.items.length === 0) {
    return { unitCost: '0', complete: true };
  }
  const { totalCost, complete } = sumIngredientsCost(recipe.items, unitCostOf);
  const scaled = (2n * totalCost + yieldScaled) / (2n * yieldScaled);
  return { unitCost: formatScaledCost(scaled), complete };
}
