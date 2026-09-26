import type { Product, ProductCategory } from '../api/types';

export interface MenuFilter {
  query: string;
  /** null = todas as categorias. */
  categoryId: number | null;
  showInactive: boolean;
  /** Mostra a linha de ingredientes (a busca olha os ingredientes mesmo escondidos). */
  showIngredients: boolean;
  /** Mostra CMV e CMV % (informação interna; escondida por padrão). */
  showCosts: boolean;
}

export const EMPTY_MENU_FILTER: MenuFilter = {
  query: '',
  categoryId: null,
  showInactive: false,
  // Compacto por padrão: uma linha por lanche para o cardápio caber na tela.
  showIngredients: false,
  showCosts: false,
};

export interface MenuSection {
  category: ProductCategory;
  products: Product[];
}

const searchKey = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * Busca do cardápio: número exato ("9") ou trecho do nome ou dos ingredientes, sem
 * diferenciar acento e maiúsculas.
 *
 * @example matchesMenuQuery(xSalada, 'alface') // true
 */
export function matchesMenuQuery(product: Product, query: string): boolean {
  const key = searchKey(query);
  if (!key) return true;
  if (/^\d+$/.test(key)) return product.menuNumber === Number(key);
  const haystack = searchKey(`${product.name} ${product.description ?? ''}`);
  return haystack.includes(key);
}

/**
 * Lanches visíveis com o filtro atual; mantém a ordem da API (categoria, número, nome).
 *
 * @example filterMenu(products, { query: 'bacon', categoryId: 2, showInactive: false })
 */
export function filterMenu(products: Product[], filter: MenuFilter): Product[] {
  return products.filter(
    (p) =>
      (filter.showInactive || p.active) &&
      (filter.categoryId === null || p.categoryId === filter.categoryId) &&
      matchesMenuQuery(p, filter.query),
  );
}

/**
 * Agrupa os lanches por categoria na ordem das categorias; seções vazias somem.
 *
 * @example menuSections(filterMenu(products, filter), categories)[0].category.name // 'Tradicional'
 */
export function menuSections(
  products: Product[],
  categories: ProductCategory[],
): MenuSection[] {
  return categories
    .map((category) => ({
      category,
      products: products.filter((p) => p.categoryId === category.id),
    }))
    .filter((section) => section.products.length > 0);
}

/**
 * Quantos lanches cada categoria teria com a busca atual (para os botões de filtro).
 *
 * @example countByCategory(products, { ...filter, categoryId: null }).get(1) // 25
 */
export function countByCategory(
  products: Product[],
  filter: MenuFilter,
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const p of filterMenu(products, { ...filter, categoryId: null }))
    counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
  return counts;
}
