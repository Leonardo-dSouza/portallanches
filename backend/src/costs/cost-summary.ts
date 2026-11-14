import type {
  BasePriceChange,
  ComponentsChange,
  CostChanges,
  CostProduct,
  CostSnapshot,
  CostSupply,
  SalePriceChange,
  SupplyRecipe,
} from './cost-types.js';

/** Troca ponto por vírgula para apresentação em português. */
function toComma(decimalText: string): string {
  return decimalText.replace('.', ',');
}

/** Descreve uma alteração ou remoção de preço base de insumo. */
function formatBasePricePart(
  change: BasePriceChange,
  suppliesById: Map<number, CostSupply>,
): string {
  const supply = suppliesById.get(change.supplyId);
  const name = supply?.name ?? String(change.supplyId);
  if (change.basePrice === null) {
    return `${name} sem preço base`;
  }
  const beforePrice = supply?.basePrice
    ? toComma(supply.basePrice)
    : 'sem preço base';
  return `${name} ${beforePrice} → ${toComma(change.basePrice)}`;
}

/** Descreve a alteração ou criação de uma ficha técnica. */
function formatRecipePart(
  recipe: SupplyRecipe,
  suppliesById: Map<number, CostSupply>,
): string {
  const supply = suppliesById.get(recipe.supplyId);
  const name = supply?.name ?? String(recipe.supplyId);
  return `Ficha ${name}`;
}

/** Descreve a remoção de uma ficha técnica existente. */
function formatRemovedRecipePart(
  supplyId: number,
  suppliesById: Map<number, CostSupply>,
): string {
  const supply = suppliesById.get(supplyId);
  const name = supply?.name ?? String(supplyId);
  return `Ficha removida ${name}`;
}

/** Descreve a alteração de composição de um produto. */
function formatComponentPart(
  change: ComponentsChange,
  productsById: Map<number, CostProduct>,
): string {
  const product = productsById.get(change.productId);
  const name = product?.name ?? String(change.productId);
  return `Receita ${name}`;
}

/** Descreve a alteração de preço de venda de um produto. */
function formatSalePricePart(
  change: SalePriceChange,
  productsById: Map<number, CostProduct>,
): string {
  const product = productsById.get(change.productId);
  const name = product?.name ?? String(change.productId);
  const beforePrice = product?.salePrice
    ? toComma(product.salePrice)
    : 'sem preço';
  return `Preço ${name} ${beforePrice} → ${toComma(change.salePrice)}`;
}

/** Junta todas as partes de alterações em uma lista sequencial de textos. */
function collectSummaryParts(
  before: CostSnapshot,
  changes: CostChanges,
): string[] {
  const suppliesById = new Map(before.supplies.map((s) => [s.id, s]));
  const productsById = new Map(before.products.map((p) => [p.id, p]));
  const parts: string[] = [];

  for (const b of changes.basePrices) {
    parts.push(formatBasePricePart(b, suppliesById));
  }
  for (const r of changes.recipes) {
    parts.push(formatRecipePart(r, suppliesById));
  }
  for (const id of changes.removedRecipeSupplyIds) {
    parts.push(formatRemovedRecipePart(id, suppliesById));
  }
  for (const c of changes.components) {
    parts.push(formatComponentPart(c, productsById));
  }
  for (const s of changes.salePrices) {
    parts.push(formatSalePricePart(s, productsById));
  }
  return parts;
}

/**
 * Produz um resumo legível das alterações de custos salvas para auditoria e histórico.
 *
 * @example summarizeCostChanges(before, changes) // "Acém 36,90 → 45,00"
 */
export function summarizeCostChanges(
  before: CostSnapshot,
  changes: CostChanges,
): string {
  const parts = collectSummaryParts(before, changes);
  if (parts.length === 0) return '';
  if (parts.length <= 5) return parts.join('; ');
  const remaining = parts.length - 5;
  return `${parts.slice(0, 5).join('; ')} e mais ${remaining}`;
}
