import type { CostSheetView, ProductCostView } from '../api/cost-types';

/** Teclas de filtro da aba da categoria (2026-11-18): o estado vem pronto da API. */
export type StatusFilter = 'all' | 'near' | 'below' | 'incomplete';

const MATCHES: Record<StatusFilter, (p: ProductCostView) => boolean> = {
  all: () => true,
  near: (p) => p.targetStatus === 'near',
  below: (p) => p.targetStatus === 'below',
  incomplete: (p) => !p.cmvComplete,
};

/**
 * Quantos lanches cada tecla de filtro mostra.
 *
 * @example countByStatus(products) // { all: 27, near: 10, below: 0, incomplete: 2 }
 */
export function countByStatus(
  products: ProductCostView[],
): Record<StatusFilter, number> {
  const count = (filter: StatusFilter) =>
    products.filter(MATCHES[filter]).length;
  return {
    all: count('all'),
    near: count('near'),
    below: count('below'),
    incomplete: count('incomplete'),
  };
}

/**
 * Lanches da tecla escolhida, na mesma ordem.
 *
 * @example filterByStatus(products, 'below')
 */
export function filterByStatus(
  products: ProductCostView[],
  filter: StatusFilter,
): ProductCostView[] {
  return products.filter(MATCHES[filter]);
}

/**
 * Lanches da categoria mais de 2 pontos abaixo da meta (o estado vem da API); 0 some da aba.
 *
 * @example belowTargetCount(view, 1) // 2
 */
export function belowTargetCount(
  view: CostSheetView,
  categoryId: number,
): number | undefined {
  const count = view.products.filter(
    (p) => p.categoryId === categoryId && p.belowTarget,
  ).length;
  return count > 0 ? count : undefined;
}
