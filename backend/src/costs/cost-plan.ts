import { UnprocessableEntityException } from '@nestjs/common';
import { unitCostFromPaid } from '../stock/entry-cost.js';
import type {
  ComponentsChange,
  CostChanges,
  CostProduct,
  CostSnapshot,
  CostSupply,
  SupplyRecipe,
} from './cost-types.js';
import { recipeUnitCost } from './recipe-cost.js';

/** Garante que um insumo referenciado existe no snapshot. */
function assertSupplyIdExists(
  supplyIds: Set<number>,
  id: number,
  context: string,
): void {
  if (!supplyIds.has(id)) {
    throw new UnprocessableEntityException(
      `Insumo ${id} inexistente em ${context}; esperado id de insumo cadastrado`,
    );
  }
}

/** Garante que um produto referenciado existe no snapshot. */
function assertProductIdExists(
  productIds: Set<number>,
  id: number,
  context: string,
): void {
  if (!productIds.has(id)) {
    throw new UnprocessableEntityException(
      `Produto ${id} inexistente em ${context}; esperado id de produto cadastrado`,
    );
  }
}

/** Valida a existência dos insumos em remoções de ficha e preços base. */
function assertSupplyChangesExist(
  supplyIds: Set<number>,
  changes: CostChanges,
): void {
  for (const id of changes.removedRecipeSupplyIds) {
    assertSupplyIdExists(supplyIds, id, 'removedRecipeSupplyIds');
  }
  for (const b of changes.basePrices) {
    assertSupplyIdExists(supplyIds, b.supplyId, 'basePrices');
  }
}

/** Valida a existência dos insumos e ingredientes de cada ficha técnica. */
function assertRecipeSuppliesExist(
  supplyIds: Set<number>,
  recipes: SupplyRecipe[],
): void {
  for (const r of recipes) {
    assertSupplyIdExists(supplyIds, r.supplyId, 'recipes');
    for (const item of r.items) {
      assertSupplyIdExists(
        supplyIds,
        item.supplyId,
        `itens da ficha ${r.supplyId}`,
      );
    }
  }
}

/** Valida a existência dos insumos utilizados nas composições de produtos. */
function assertComponentSuppliesExist(
  supplyIds: Set<number>,
  components: ComponentsChange[],
): void {
  for (const c of components) {
    for (const item of c.components) {
      assertSupplyIdExists(
        supplyIds,
        item.supplyId,
        `componentes do produto ${c.productId}`,
      );
    }
  }
}

/** Garante que todos os insumos e produtos referenciados nas alterações existem. */
function assertEntitiesExist(
  snapshot: CostSnapshot,
  changes: CostChanges,
): void {
  const supplyIds = new Set(snapshot.supplies.map((s) => s.id));
  const productIds = new Set(snapshot.products.map((p) => p.id));
  assertSupplyChangesExist(supplyIds, changes);
  assertRecipeSuppliesExist(supplyIds, changes.recipes);
  assertComponentSuppliesExist(supplyIds, changes.components);
  for (const c of changes.components) {
    assertProductIdExists(productIds, c.productId, 'components');
  }
  for (const s of changes.salePrices) {
    assertProductIdExists(productIds, s.productId, 'salePrices');
  }
}

/** Garante que combos não recebem alteração de componentes nem de preço de venda. */
function assertNoComboChanges(
  products: CostProduct[],
  changes: CostChanges,
): void {
  const combos = new Set(
    products.filter((p) => p.bundleItems.length > 0).map((p) => p.id),
  );
  for (const c of changes.components) {
    if (combos.has(c.productId)) {
      throw new UnprocessableEntityException(
        `Tentativa de alterar composição do combo ${c.productId}; esperado produto comum sem itens de combo`,
      );
    }
  }
  for (const s of changes.salePrices) {
    if (combos.has(s.productId)) {
      throw new UnprocessableEntityException(
        `Tentativa de alterar preço de venda do combo ${s.productId}; esperado produto comum sem itens de combo`,
      );
    }
  }
}

/** Constrói a lista final de fichas aplicando remoções e adições/substituições. */
function buildFinalRecipes(
  currentRecipes: SupplyRecipe[],
  changes: CostChanges,
): SupplyRecipe[] {
  const removed = new Set(changes.removedRecipeSupplyIds);
  const updated = new Map(changes.recipes.map((r) => [r.supplyId, r]));
  const remaining = currentRecipes
    .filter((r) => !removed.has(r.supplyId) && !updated.has(r.supplyId))
    .map((r) => ({ ...r, items: r.items.map((i) => ({ ...i })) }));
  const added = changes.recipes.map((r) => ({
    ...r,
    items: r.items.map((i) => ({ ...i })),
  }));
  return [...remaining, ...added];
}

/** Garante que nenhuma ficha referencia a si mesma nem outro insumo produzido. */
function assertValidRecipeLayers(recipes: SupplyRecipe[]): void {
  const producedIds = new Set(recipes.map((r) => r.supplyId));
  for (const recipe of recipes) {
    for (const item of recipe.items) {
      if (item.supplyId === recipe.supplyId) {
        throw new UnprocessableEntityException(
          `Ficha do insumo ${recipe.supplyId} tem a si próprio como ingrediente; esperado insumo diferente`,
        );
      }
      if (producedIds.has(item.supplyId)) {
        throw new UnprocessableEntityException(
          `Ingrediente ${item.supplyId} é insumo produzido; esperado insumo sem ficha (apenas um nível)`,
        );
      }
    }
  }
}

/** Garante que nenhum insumo que termina com ficha técnica receba preço base. */
function assertNoBasePriceOnProduced(
  changes: CostChanges,
  producedIds: Set<number>,
): void {
  for (const change of changes.basePrices) {
    if (producedIds.has(change.supplyId)) {
      throw new UnprocessableEntityException(
        `Preço base definido no insumo produzido ${change.supplyId}; esperado insumo sem ficha técnica`,
      );
    }
  }
}

/** Remove informações de preço base de insumos que se tornaram produzidos. */
function clearBasePriceForProduced(
  supplies: CostSupply[],
  producedIds: Set<number>,
): void {
  for (const supply of supplies) {
    if (producedIds.has(supply.id)) {
      supply.basePrice = null;
      supply.baseQuantity = null;
      supply.baseLabel = null;
    }
  }
}

/** Atualiza preços base e custos unitários correspondentes nos insumos normais. */
function applyBasePriceChanges(
  supplies: CostSupply[],
  changes: CostChanges,
): void {
  const changesById = new Map(changes.basePrices.map((b) => [b.supplyId, b]));
  for (const supply of supplies) {
    const change = changesById.get(supply.id);
    if (!change) continue;
    supply.basePrice = change.basePrice;
    supply.baseQuantity = change.baseQuantity;
    supply.baseLabel = change.baseLabel;
    supply.unitCost =
      change.basePrice === null
        ? null
        : unitCostFromPaid(change.basePrice, change.baseQuantity);
  }
}

/** Calcula o custo unitário de um insumo produzido ou define null se sem custo. */
function recalculateSingleProduced(
  target: CostSupply,
  recipe: SupplyRecipe,
  suppliesById: Map<number, CostSupply>,
): void {
  const hasAnyCost = recipe.items.some(
    (item) => (suppliesById.get(item.supplyId)?.unitCost ?? null) !== null,
  );
  if (!hasAnyCost) {
    target.unitCost = null;
    return;
  }
  const { unitCost } = recipeUnitCost(
    recipe,
    (id) => suppliesById.get(id)?.unitCost ?? null,
  );
  target.unitCost = unitCost;
}

/** Recalcula o custo unitário de todos os insumos produzidos via recipeUnitCost. */
function recalculateProducedSupplies(
  supplies: CostSupply[],
  recipes: SupplyRecipe[],
): void {
  const suppliesById = new Map(supplies.map((s) => [s.id, s]));
  for (const recipe of recipes) {
    const target = suppliesById.get(recipe.supplyId);
    if (target) recalculateSingleProduced(target, recipe, suppliesById);
  }
}

/** Clona e aplica alterações de componentes e preço de venda aos produtos. */
function applyProductChanges(
  products: CostProduct[],
  changes: CostChanges,
): CostProduct[] {
  const componentsById = new Map(
    changes.components.map((c) => [c.productId, c.components]),
  );
  const salesById = new Map(
    changes.salePrices.map((s) => [s.productId, s.salePrice]),
  );
  return products.map((product) => {
    const newComponents = componentsById.get(product.id);
    const newSalePrice = salesById.get(product.id);
    return {
      ...product,
      components: newComponents
        ? newComponents.map((c) => ({ ...c }))
        : product.components.map((c) => ({ ...c })),
      bundleItems: product.bundleItems.map((b) => ({ ...b })),
      salePrice: newSalePrice !== undefined ? newSalePrice : product.salePrice,
    };
  });
}

/** Clona a lista de insumos com suas propriedades internas. */
function cloneSupplies(supplies: CostSupply[]): CostSupply[] {
  return supplies.map((s) => ({
    ...s,
    packages: s.packages.map((p) => ({ ...p })),
  }));
}

/**
 * Aplica um rascunho de mudanças de custos sobre o snapshot original de forma pura.
 *
 * @example applyCostChanges(snapshot, { basePrices: [], recipes: [], removedRecipeSupplyIds: [], components: [], salePrices: [] })
 */
export function applyCostChanges(
  snapshot: CostSnapshot,
  changes: CostChanges,
): CostSnapshot {
  assertEntitiesExist(snapshot, changes);
  assertNoComboChanges(snapshot.products, changes);
  const recipes = buildFinalRecipes(snapshot.recipes, changes);
  assertValidRecipeLayers(recipes);
  const producedIds = new Set(recipes.map((r) => r.supplyId));
  assertNoBasePriceOnProduced(changes, producedIds);

  const supplies = cloneSupplies(snapshot.supplies);
  clearBasePriceForProduced(supplies, producedIds);
  applyBasePriceChanges(supplies, changes);
  recalculateProducedSupplies(supplies, recipes);
  const products = applyProductChanges(snapshot.products, changes);

  return { ...snapshot, supplies, recipes, products };
}
