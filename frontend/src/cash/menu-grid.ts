import type { MenuItem } from './menu-lookup';
import { searchMenu } from './menu-lookup';
import type { DraftLine } from './order-lines';

/**
 * Categorias na ordem em que aparecem em `day.menu`, sem repetição.
 *
 * @example categoriesOf([{ categoryName: 'Tradicional' }, { categoryName: 'Artesanal' }])
 * // ['Tradicional', 'Artesanal']
 */
export function categoriesOf(menu: MenuItem[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of menu) {
    if (!seen.has(item.categoryName)) {
      seen.add(item.categoryName);
      result.push(item.categoryName);
    }
  }
  return result;
}

/**
 * Itens visíveis na grade: com texto de busca, o `searchMenu` de todas as categorias;
 * sem texto, os itens da categoria escolhida.
 *
 * @example visibleItems(menu, '', 'Tradicional') // itens da categoria Tradicional
 */
export function visibleItems(
  menu: MenuItem[],
  searchText: string,
  activeCategory: string,
): MenuItem[] {
  if (searchText.trim()) return searchMenu(menu, searchText);
  return menu.filter((item) => item.categoryName === activeCategory);
}

/**
 * Quantidade total de um produto nas linhas principais da comanda (sem adicionais).
 * Usado para o selo de quantidade nos botões da grade do celular.
 *
 * @example quantityInOrder([{ productId: 1, quantity: 2 }], 1) // 2
 */
export function quantityInOrder(lines: DraftLine[], productId: number): number {
  return lines
    .filter((line) => line.productId === productId)
    .reduce((sum, line) => sum + line.quantity, 0);
}
