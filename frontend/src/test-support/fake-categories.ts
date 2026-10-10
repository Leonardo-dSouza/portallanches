import type { HttpMethod } from '../api/api-client';
import type { ProductCategory } from '../api/types';

interface CategoryRouteResult {
  categories: ProductCategory[];
  response: unknown;
}

type CategoryBody = Record<string, unknown>;

function created(
  categories: ProductCategory[],
  body: CategoryBody,
): CategoryRouteResult {
  const category: ProductCategory = {
    id: Math.max(0, ...categories.map((c) => c.id)) + 1,
    name: String(body.name),
    sortOrder: Math.max(0, ...categories.map((c) => c.sortOrder)) + 1,
    active: body.active !== false,
    importLocked: false,
    addonCategoryId: null,
  };
  return { categories: [...categories, category], response: category };
}

function addonSet(
  categories: ProductCategory[],
  id: number,
  body: CategoryBody,
) {
  const addonCategoryId = (body.addonCategoryId as number | null) ?? null;
  const next = categories.map((c) =>
    c.id === id ? { ...c, addonCategoryId } : c,
  );
  return { categories: next, response: next.find((c) => c.id === id) };
}

function reordered(categories: ProductCategory[], ids: number[]) {
  const next = categories.map((c) => ({
    ...c,
    sortOrder: ids.indexOf(c.id) + 1,
  }));
  return { categories: next, response: next };
}

function updated(
  categories: ProductCategory[],
  id: number,
  body: CategoryBody,
) {
  const next = categories.map((c) =>
    c.id === id
      ? { ...c, name: String(body.name), active: body.active === true }
      : c,
  );
  return { categories: next, response: next.find((c) => c.id === id) };
}

/**
 * `/product-categories` do backend em memória: GET, POST, PUT `order`, PUT `:id/addon-category` e
 * PUT `:id` (sem a trava
 * de nome das categorias de planilha, que é do backend).
 *
 * @example fakeCategoryRoute(categories, 'POST', '/product-categories', { name: 'Combos' }).response
 */
export function fakeCategoryRoute(
  categories: ProductCategory[],
  method: HttpMethod,
  path: string,
  body: CategoryBody,
): CategoryRouteResult {
  if (method === 'GET') return { categories, response: categories };
  if (method === 'POST') return created(categories, body);
  if (path.endsWith('/addon-category'))
    return addonSet(categories, Number(path.split('/')[2]), body);
  if (path.endsWith('/order'))
    return reordered(categories, body.ids as number[]);
  return updated(categories, Number(path.split('/')[2]), body);
}
