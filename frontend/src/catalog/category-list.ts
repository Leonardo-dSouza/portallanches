import type { ProductCategory } from '../api/types';
import { inSortOrder, moveInSortOrder } from './sort-order';

/**
 * Categorias na ordem do cardápio (`sortOrder`), sem mexer na lista recebida.
 *
 * @example inMenuOrder(categories)[0].name // 'Tradicional'
 */
export function inMenuOrder(categories: ProductCategory[]): ProductCategory[] {
  return inSortOrder(categories);
}

/**
 * Ids de todas as categorias (inativas também) com `id` trocado de lugar com a vizinha:
 * `-1` sobe, `1` desce. Null na ponta.
 *
 * @example moveCategory(categories, 3, -1) // [1, 3, 2]
 */
export function moveCategory(
  categories: ProductCategory[],
  id: number,
  direction: -1 | 1,
): number[] | null {
  return moveInSortOrder(categories, id, direction);
}

/**
 * Opções do campo Categoria da ficha: as ativas, mais a do item mesmo que tenha saído de uso.
 *
 * @example selectableCategories(categories, product.categoryId)
 */
export function selectableCategories(
  categories: ProductCategory[],
  currentId: number | null,
): ProductCategory[] {
  return inMenuOrder(categories).filter((c) => c.active || c.id === currentId);
}

/**
 * Categorias que podem ser a lista de adicionais de `category` (as mesmas regras do backend:
 * não ela mesma, sem adicionais próprios). Vazio se `category` já é a lista de adicionais de outra.
 *
 * @example addonTargets(categories, artesanal).map((c) => c.name) // ['Adicionais', ...]
 */
export function addonTargets(
  categories: ProductCategory[],
  category: ProductCategory,
): ProductCategory[] {
  if (categories.some((c) => c.addonCategoryId === category.id)) return [];
  // A lista de escolha (o Pão) não vira adicionais nem ganha adicionais (2026-11-08).
  if (isChoiceList(categories, category)) return [];
  return inMenuOrder(categories).filter(
    (c) =>
      c.id !== category.id &&
      c.addonCategoryId === null &&
      !isChoiceList(categories, c),
  );
}

/**
 * A categoria é a lista de opções da escolha obrigatória de outra (o Pão do Artesanal).
 *
 * @example isChoiceList(categories, pao) // true
 */
export function isChoiceList(
  categories: ProductCategory[],
  category: ProductCategory,
): boolean {
  return categories.some((c) => c.choiceCategoryId === category.id);
}

/**
 * Categorias que podem ser a escolha obrigatória de `category` (as regras do backend,
 * 2026-11-08): não ela mesma, sem adicionais nem escolha próprios e que não sejam lista de
 * adicionais. Vazio se `category` já é lista (de escolha ou de adicionais) de outra.
 *
 * @example choiceTargets(categories, artesanal).map((c) => c.name) // ['Pão', ...]
 */
export function choiceTargets(
  categories: ProductCategory[],
  category: ProductCategory,
): ProductCategory[] {
  const isList = (target: ProductCategory) =>
    categories.some((c) => c.addonCategoryId === target.id);
  if (isList(category) || isChoiceList(categories, category)) return [];
  return inMenuOrder(categories).filter(
    (c) =>
      c.id !== category.id &&
      c.addonCategoryId === null &&
      c.choiceCategoryId === null &&
      !isList(c),
  );
}
