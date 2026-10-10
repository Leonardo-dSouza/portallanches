import type { ProductCategory } from '../api/types';

const bySortOrder = (a: ProductCategory, b: ProductCategory): number =>
  a.sortOrder - b.sortOrder;

/**
 * Categorias na ordem do cardápio (`sortOrder`), sem mexer na lista recebida.
 *
 * @example inMenuOrder(categories)[0].name // 'Tradicional'
 */
export function inMenuOrder(categories: ProductCategory[]): ProductCategory[] {
  return [...categories].sort(bySortOrder);
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
  const ids = inMenuOrder(categories).map((c) => c.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
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
  return inMenuOrder(categories).filter(
    (c) => c.id !== category.id && c.addonCategoryId === null,
  );
}
