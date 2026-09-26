import type { MenuPlan } from './menu-types.js';

/**
 * Resumo do plano para o terminal: insumos e lanches por categoria.
 *
 * @example formatMenuSummary(plan) // 'Insumos: 40\nLanches: Tradicional 25, Artesanal 22, Adicionais 19'
 */
export function formatMenuSummary(plan: MenuPlan): string {
  const byCategory = new Map<string, number>();
  for (const product of plan.products)
    byCategory.set(
      product.category,
      (byCategory.get(product.category) ?? 0) + 1,
    );
  const categories = [...byCategory].map(([name, count]) => `${name} ${count}`);
  return `Insumos: ${plan.supplies.length}\nLanches: ${categories.join(', ') || 'nenhum'}`;
}

export function formatChanges(changes: string[]): string {
  if (changes.length === 0)
    return 'Mudanças: nenhuma (o banco já está igual à planilha).';
  return [
    `Mudanças (${changes.length}):`,
    ...changes.map((c) => `  ${c}`),
  ].join('\n');
}
