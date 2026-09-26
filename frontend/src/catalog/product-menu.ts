import type { Product, ProductCategory } from '../api/types';

/** Meta de CMV da planilha de custos: PV = CMV ÷ 0,42. */
export const CMV_TARGET_PERCENT = 42;
// O PV é arredondado para cima em R$ 0,10, então o CMV % real fica um pouco abaixo da meta;
// até meio ponto acima ainda é arredondamento, não preço defasado.
const CMV_ON_TARGET_LIMIT = CMV_TARGET_PERCENT + 0.5;
const CMV_HIGH_LIMIT = 50;

export interface MenuFilter {
  query: string;
  /** null = todas as categorias. */
  categoryId: number | null;
  showInactive: boolean;
  /** Mostra a linha de ingredientes (a busca olha os ingredientes mesmo escondidos). */
  showIngredients: boolean;
}

export const EMPTY_MENU_FILTER: MenuFilter = {
  query: '',
  categoryId: null,
  showInactive: false,
  // Compacto por padrão: uma linha por lanche para o cardápio caber na tela.
  showIngredients: false,
};

export interface MenuSection {
  category: ProductCategory;
  products: Product[];
}

/** `ok` na meta, `high` acima dela, `over` preço claramente defasado, `none` sem preço. */
export type CmvLevel = 'ok' | 'high' | 'over' | 'none';

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

/**
 * Nível do CMV % em relação à meta de 42%.
 *
 * @example cmvLevel('41.9') // 'ok'
 */
export function cmvLevel(percent: string | null): CmvLevel {
  if (percent === null) return 'none';
  const value = Number(percent);
  if (value <= CMV_ON_TARGET_LIMIT) return 'ok';
  return value <= CMV_HIGH_LIMIT ? 'high' : 'over';
}
