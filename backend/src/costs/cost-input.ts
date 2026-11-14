import { BadRequestException } from '@nestjs/common';
import { parseId, parseObject, parseText } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import { parseQuantity } from '../common/quantity.js';
import type {
  BasePriceChange,
  ComponentsChange,
  CostChanges,
  RecipeItem,
  SalePriceChange,
  SupplyRecipe,
} from './cost-types.js';

/** Garante que uma lista de ids não possui repetição. */
function assertUniqueIds(ids: number[], listName: string): void {
  const seen = new Set<number>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new BadRequestException(
        `Id ${id} repetido em "${listName}": esperado cada id no máximo uma vez`,
      );
    }
    seen.add(id);
  }
}

/** Converte e valida um item de alteração de preço base. */
function parseBasePriceItem(raw: unknown, index: number): BasePriceChange {
  const item = parseObject(raw, `item de basePrices[${index}]`);
  const supplyId = parseId(item.supplyId, `basePrices[${index}].supplyId`);
  const basePrice =
    item.basePrice === null
      ? null
      : parseMoney(item.basePrice, `basePrices[${index}].basePrice`, false);
  const baseQuantity = parseQuantity(
    item.baseQuantity,
    `basePrices[${index}].baseQuantity`,
    false,
  );
  const baseLabel =
    item.baseLabel === null || item.baseLabel === undefined
      ? null
      : parseText(item.baseLabel, `basePrices[${index}].baseLabel`, 30);
  return { supplyId, basePrice, baseQuantity, baseLabel };
}

/** Valida a lista de alterações de preço base. */
function parseBasePrices(raw: unknown): BasePriceChange[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new BadRequestException(
      `Campo "basePrices" inválido: recebido ${JSON.stringify(raw)}, esperado lista`,
    );
  }
  const items = raw.map((item, index) => parseBasePriceItem(item, index));
  assertUniqueIds(
    items.map((i) => i.supplyId),
    'basePrices',
  );
  return items;
}

/** Converte e valida um ingrediente de ficha técnica. */
function parseRecipeItem(raw: unknown, path: string): RecipeItem {
  const item = parseObject(raw, path);
  const supplyId = parseId(item.supplyId, `${path}.supplyId`);
  const quantity = parseQuantity(item.quantity, `${path}.quantity`, false);
  return { supplyId, quantity };
}

/** Valida a lista de ingredientes de uma ficha técnica sem duplicações. */
function parseRecipeItems(rawItems: unknown, path: string): RecipeItem[] {
  if (!Array.isArray(rawItems)) {
    throw new BadRequestException(
      `Campo "${path}.items" inválido: esperado lista de ingredientes`,
    );
  }
  const items = rawItems.map((item, index) =>
    parseRecipeItem(item, `${path}.items[${index}]`),
  );
  assertUniqueIds(
    items.map((item) => item.supplyId),
    `${path}.items`,
  );
  return items;
}

/** Converte e valida uma ficha técnica de insumo. */
function parseSupplyRecipe(raw: unknown, index: number): SupplyRecipe {
  const recipe = parseObject(raw, `item de recipes[${index}]`);
  const supplyId = parseId(recipe.supplyId, `recipes[${index}].supplyId`);
  const yieldQuantity = parseQuantity(
    recipe.yieldQuantity,
    `recipes[${index}].yieldQuantity`,
    false,
  );
  const items = parseRecipeItems(recipe.items, `recipes[${index}]`);
  return { supplyId, yieldQuantity, items };
}

/** Valida a lista de fichas técnicas do rascunho. */
function parseRecipes(raw: unknown): SupplyRecipe[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new BadRequestException(
      `Campo "recipes" inválido: recebido ${JSON.stringify(raw)}, esperado lista`,
    );
  }
  const recipes = raw.map((item, index) => parseSupplyRecipe(item, index));
  assertUniqueIds(
    recipes.map((r) => r.supplyId),
    'recipes',
  );
  return recipes;
}

/** Valida lista de ids de fichas removidas. */
function parseRemovedRecipeSupplyIds(raw: unknown): number[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new BadRequestException(
      `Campo "removedRecipeSupplyIds" inválido: esperado lista de ids`,
    );
  }
  const ids = raw.map((id, index) =>
    parseId(id, `removedRecipeSupplyIds[${index}]`),
  );
  assertUniqueIds(ids, 'removedRecipeSupplyIds');
  return ids;
}

/** Valida a lista de componentes de produto sem duplicações. */
function parseProductComponents(rawList: unknown, path: string): RecipeItem[] {
  if (!Array.isArray(rawList)) {
    throw new BadRequestException(
      `Campo "${path}.components" inválido: esperado lista de componentes`,
    );
  }
  const items = rawList.map((item, index) =>
    parseRecipeItem(item, `${path}.components[${index}]`),
  );
  assertUniqueIds(
    items.map((c) => c.supplyId),
    `${path}.components`,
  );
  return items;
}

/** Converte e valida alteração de composição de um produto. */
function parseComponentsChange(raw: unknown, index: number): ComponentsChange {
  const comp = parseObject(raw, `item de components[${index}]`);
  const productId = parseId(comp.productId, `components[${index}].productId`);
  const components = parseProductComponents(
    comp.components,
    `components[${index}]`,
  );
  return { productId, components };
}

/** Valida lista de alterações de composição de produtos. */
function parseComponents(raw: unknown): ComponentsChange[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new BadRequestException(
      `Campo "components" inválido: recebido ${JSON.stringify(raw)}, esperado lista`,
    );
  }
  const list = raw.map((item, index) => parseComponentsChange(item, index));
  assertUniqueIds(
    list.map((c) => c.productId),
    'components',
  );
  return list;
}

/** Converte e valida alteração de preço de venda de um produto. */
function parseSalePriceItem(raw: unknown, index: number): SalePriceChange {
  const item = parseObject(raw, `item de salePrices[${index}]`);
  const productId = parseId(item.productId, `salePrices[${index}].productId`);
  const salePrice = parseMoney(
    item.salePrice,
    `salePrices[${index}].salePrice`,
    false,
  );
  return { productId, salePrice };
}

/** Valida lista de alterações de preço de venda. */
function parseSalePrices(raw: unknown): SalePriceChange[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new BadRequestException(
      `Campo "salePrices" inválido: recebido ${JSON.stringify(raw)}, esperado lista`,
    );
  }
  const list = raw.map((item, index) => parseSalePriceItem(item, index));
  assertUniqueIds(
    list.map((s) => s.productId),
    'salePrices',
  );
  return list;
}

/**
 * Valida o corpo JSON do rascunho de custos vindo da tela e devolve as mudanças normalizadas.
 *
 * @example parseCostChanges({ basePrices: [{ supplyId: 1, basePrice: '36.90', baseQuantity: '1' }] })
 */
export function parseCostChanges(body: unknown): CostChanges {
  const record = parseObject(body, 'mudanças de custo');
  return {
    basePrices: parseBasePrices(record.basePrices),
    recipes: parseRecipes(record.recipes),
    removedRecipeSupplyIds: parseRemovedRecipeSupplyIds(
      record.removedRecipeSupplyIds,
    ),
    components: parseComponents(record.components),
    salePrices: parseSalePrices(record.salePrices),
  };
}
