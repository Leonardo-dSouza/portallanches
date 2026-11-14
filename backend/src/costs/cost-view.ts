import { formatCents, toCents } from '../common/money.js';
import { expandBundle } from '../products/bundle.js';
import {
  cmvPercent,
  computeCmv,
  type CostedComponent,
} from '../products/cmv.js';
import type {
  CostImpact,
  CostProduct,
  CostSnapshot,
  CostSupply,
  PricingCategory,
  ProductCostView,
  ProductImpact,
  SupplyCostChange,
} from './cost-types.js';
import {
  ifoodPvFor,
  isBelowTarget,
  marginPercent,
  profitFor,
  pvFor,
} from './pricing.js';

interface ComponentWithSupply extends CostedComponent {
  supplyId: number;
}

/**
 * Informa se o custo de um insumo está completo (não nulo e com insumos da ficha completos).
 *
 * @example isSupplyCostComplete(10, snapshot) // true
 */
export function isSupplyCostComplete(
  supplyId: number,
  snapshot: CostSnapshot,
): boolean {
  const supply = snapshot.supplies.find((s) => s.id === supplyId);
  if (!supply || supply.unitCost === null) return false;
  const recipe = snapshot.recipes.find((r) => r.supplyId === supplyId);
  if (!recipe) return true;
  if (recipe.items.length === 0) return false;
  const suppliesById = new Map(snapshot.supplies.map((s) => [s.id, s]));
  return recipe.items.every(
    (item) => (suppliesById.get(item.supplyId)?.unitCost ?? null) !== null,
  );
}

/** Expande os componentes de itens agrupados em um produto combo. */
function expandBundleComponents(
  product: CostProduct,
  productsById: Map<number, CostProduct>,
  suppliesById: Map<number, CostSupply>,
): ComponentWithSupply[] {
  const bundleCosts = product.bundleItems.map((item) => {
    const sub = productsById.get(item.productId);
    const subComponents = sub
      ? sub.components.map((c) => ({
          supplyId: c.supplyId,
          quantity: c.quantity,
          unitCost: suppliesById.get(c.supplyId)?.unitCost ?? null,
        }))
      : [];
    return { quantity: item.quantity, components: subComponents };
  });
  return expandBundle(bundleCosts);
}

/** Obtém os componentes custeados de um produto direto ou expandido de combo. */
function costedComponentsOf(
  product: CostProduct,
  productsById: Map<number, CostProduct>,
  suppliesById: Map<number, CostSupply>,
): ComponentWithSupply[] {
  if (product.bundleItems.length > 0) {
    return expandBundleComponents(product, productsById, suppliesById);
  }
  return product.components.map((c) => ({
    supplyId: c.supplyId,
    quantity: c.quantity,
    unitCost: suppliesById.get(c.supplyId)?.unitCost ?? null,
  }));
}

interface ProductPricing {
  pv: string | null;
  ifoodPv: string | null;
  profit: string | null;
  marginPercent: string | null;
  belowTarget: boolean;
}

/** Calcula margens e preços sugeridos para categoria com percentuais configurados. */
function calculateTargetPricing(
  product: CostProduct,
  cmv: string,
  category: PricingCategory,
  snapshot: CostSnapshot,
): ProductPricing {
  const fixed = category.fixedCostPercent!;
  const target = category.profitPercent!;
  const pv = pvFor(cmv, fixed, target);
  const ifoodPv = ifoodPvFor(
    cmv,
    fixed,
    snapshot.ifood.profitPercent,
    snapshot.ifood.commissionPercent,
  );
  if (product.salePrice === null) {
    return {
      pv,
      ifoodPv,
      profit: null,
      marginPercent: null,
      belowTarget: false,
    };
  }
  const profit = profitFor(product.salePrice, cmv, fixed);
  const margin = marginPercent(profit, product.salePrice);
  const below = isBelowTarget(product.salePrice, cmv, fixed, target);
  return { pv, ifoodPv, profit, marginPercent: margin, belowTarget: below };
}

/** Calcula lucro direto e margem para categoria sem percentuais configurados. */
function calculateSimplePricing(
  product: CostProduct,
  cmv: string,
): ProductPricing {
  if (product.salePrice === null) {
    return {
      pv: null,
      ifoodPv: null,
      profit: null,
      marginPercent: null,
      belowTarget: false,
    };
  }
  const profitCents = toCents(product.salePrice) - toCents(cmv);
  const profit = formatCents(profitCents);
  const margin = marginPercent(profit, product.salePrice);
  return {
    pv: null,
    ifoodPv: null,
    profit,
    marginPercent: margin,
    belowTarget: false,
  };
}

/** Determina o cálculo de preços conforme a presença de percentuais na categoria. */
function resolveProductPricing(
  product: CostProduct,
  cmv: string,
  category: PricingCategory | undefined,
  snapshot: CostSnapshot,
): ProductPricing {
  const hasPct =
    category?.fixedCostPercent !== null &&
    category?.fixedCostPercent !== undefined &&
    category?.profitPercent !== null &&
    category?.profitPercent !== undefined;
  if (!hasPct) return calculateSimplePricing(product, cmv);
  return calculateTargetPricing(product, cmv, category!, snapshot);
}

/** Monta a visão de custos, CMV e precificação para um produto individual. */
function buildProductCostView(
  product: CostProduct,
  snapshot: CostSnapshot,
  productsById: Map<number, CostProduct>,
  suppliesById: Map<number, CostSupply>,
  categoriesById: Map<number, PricingCategory>,
): ProductCostView {
  const components = costedComponentsOf(product, productsById, suppliesById);
  const { cmv, complete } = computeCmv(components);
  const allComplete = components.every((c) =>
    isSupplyCostComplete(c.supplyId, snapshot),
  );
  const category = categoriesById.get(product.categoryId);
  const pricing = resolveProductPricing(product, cmv, category, snapshot);
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    menuNumber: product.menuNumber,
    salePrice: product.salePrice,
    cmv,
    cmvComplete: complete && allComplete,
    cmvPercent: cmvPercent(cmv, product.salePrice),
    ...pricing,
  };
}

/**
 * Gera as visões de custos e precificação de todos os produtos na ordem do snapshot.
 *
 * @example productCostViews(snapshot)
 */
export function productCostViews(snapshot: CostSnapshot): ProductCostView[] {
  const productsById = new Map(snapshot.products.map((p) => [p.id, p]));
  const suppliesById = new Map(snapshot.supplies.map((s) => [s.id, s]));
  const categoriesById = new Map(snapshot.categories.map((c) => [c.id, c]));
  return snapshot.products.map((product) =>
    buildProductCostView(
      product,
      snapshot,
      productsById,
      suppliesById,
      categoriesById,
    ),
  );
}

/** Verifica se qualquer campo da visão do produto sofreu alteração. */
function isProductViewChanged(
  before: ProductCostView,
  after: ProductCostView,
): boolean {
  return (
    before.name !== after.name ||
    before.categoryId !== after.categoryId ||
    before.menuNumber !== after.menuNumber ||
    before.salePrice !== after.salePrice ||
    before.cmv !== after.cmv ||
    before.cmvComplete !== after.cmvComplete ||
    before.cmvPercent !== after.cmvPercent ||
    before.pv !== after.pv ||
    before.ifoodPv !== after.ifoodPv ||
    before.profit !== after.profit ||
    before.marginPercent !== after.marginPercent ||
    before.belowTarget !== after.belowTarget
  );
}

/** Identifica os insumos cujo custo unitário foi alterado. */
function findSupplyCostChanges(
  before: CostSnapshot,
  after: CostSnapshot,
): SupplyCostChange[] {
  const beforeSuppliesById = new Map(before.supplies.map((s) => [s.id, s]));
  const changes: SupplyCostChange[] = [];
  for (const afterSupply of after.supplies) {
    const beforeSupply = beforeSuppliesById.get(afterSupply.id);
    const beforeCost = beforeSupply?.unitCost ?? null;
    if (beforeCost !== afterSupply.unitCost) {
      changes.push({
        supplyId: afterSupply.id,
        name: afterSupply.name,
        before: beforeCost,
        after: afterSupply.unitCost,
      });
    }
  }
  return changes;
}

/** Compara as visões de produtos antes e depois para detectar alterações e transições de meta. */
function findProductImpacts(
  beforeViews: ProductCostView[],
  afterViews: ProductCostView[],
): { products: ProductImpact[]; becameBelowTarget: number } {
  const beforeMap = new Map(beforeViews.map((v) => [v.id, v]));
  const products: ProductImpact[] = [];
  let becameBelowTarget = 0;
  for (const afterView of afterViews) {
    const beforeView = beforeMap.get(afterView.id);
    if (!beforeView) continue;
    if (isProductViewChanged(beforeView, afterView)) {
      products.push({ before: beforeView, after: afterView });
    }
    if (!beforeView.belowTarget && afterView.belowTarget) {
      becameBelowTarget += 1;
    }
  }
  return { products, becameBelowTarget };
}

/**
 * Calcula o impacto comparativo de custos e produtos antes e depois de alterações.
 *
 * @example costImpact(beforeSnapshot, afterSnapshot)
 */
export function costImpact(
  before: CostSnapshot,
  after: CostSnapshot,
): CostImpact {
  const supplies = findSupplyCostChanges(before, after);
  const beforeViews = productCostViews(before);
  const afterViews = productCostViews(after);
  const { products, becameBelowTarget } = findProductImpacts(
    beforeViews,
    afterViews,
  );
  return { supplies, products, becameBelowTarget };
}
