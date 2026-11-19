import type {
  BasePriceChange,
  ComponentsChange,
  CostChanges,
  SupplyRecipe,
} from '../api/cost-types';

/**
 * Cria a estrutura inicial de alterações de custo vazia.
 *
 * @example const changes = createEmptyCostChanges();
 */
export function createEmptyCostChanges(): CostChanges {
  return {
    basePrices: [],
    recipes: [],
    removedRecipeSupplyIds: [],
    components: [],
    salePrices: [],
  };
}

/**
 * Total de entradas em todas as listas de alterações do rascunho.
 *
 * @example const total = countChanges(changes);
 */
export function countChanges(changes: CostChanges): number {
  return (
    changes.basePrices.length +
    changes.recipes.length +
    changes.removedRecipeSupplyIds.length +
    changes.components.length +
    changes.salePrices.length
  );
}

/**
 * Registra ou substitui a alteração de preço base de um insumo.
 *
 * @example const next = setBasePriceChange(changes, { supplyId: 1, basePrice: '45.00', baseQuantity: '1', baseLabel: 'kg' });
 */
export function setBasePriceChange(
  changes: CostChanges,
  change: BasePriceChange,
): CostChanges {
  const filtered = changes.basePrices.filter(
    (b) => b.supplyId !== change.supplyId,
  );
  return {
    ...changes,
    basePrices: [...filtered, change],
  };
}

/**
 * Registra ou substitui uma receita de produção e remove eventual marcação de remoção.
 *
 * @example const next = setRecipeChange(changes, recipe);
 */
export function setRecipeChange(
  changes: CostChanges,
  recipe: SupplyRecipe,
): CostChanges {
  const filteredRecipes = changes.recipes.filter(
    (r) => r.supplyId !== recipe.supplyId,
  );
  // Se o insumo estava marcado para remoção, cadastrar nova receita desfaz a remoção.
  const filteredRemoved = changes.removedRecipeSupplyIds.filter(
    (id) => id !== recipe.supplyId,
  );
  return {
    ...changes,
    recipes: [...filteredRecipes, recipe],
    removedRecipeSupplyIds: filteredRemoved,
  };
}

/**
 * Marca uma receita para remoção e descarta eventual alteração dela no rascunho.
 *
 * @example const next = removeRecipeChange(changes, 2);
 */
export function removeRecipeChange(
  changes: CostChanges,
  supplyId: number,
): CostChanges {
  const filteredRecipes = changes.recipes.filter(
    (r) => r.supplyId !== supplyId,
  );
  const alreadyMarked = changes.removedRecipeSupplyIds.includes(supplyId);
  const nextRemoved = alreadyMarked
    ? changes.removedRecipeSupplyIds
    : [...changes.removedRecipeSupplyIds, supplyId];
  return {
    ...changes,
    recipes: filteredRecipes,
    removedRecipeSupplyIds: nextRemoved,
  };
}

/**
 * Registra ou substitui a alteração de componentes de um produto.
 *
 * @example const next = setComponentsChange(changes, { productId: 10, components: [] });
 */
export function setComponentsChange(
  changes: CostChanges,
  change: ComponentsChange,
): CostChanges {
  const filtered = changes.components.filter(
    (c) => c.productId !== change.productId,
  );
  return {
    ...changes,
    components: [...filtered, change],
  };
}
