import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';

/**
 * Adicionais que a linha aceita: os itens da categoria de adicionais do item (Cadastros →
 * Categorias). Vazio = o item não aceita adicionais.
 *
 * @example addonChoices(menu, line).map((m) => m.name) // ['Add bacon', 'Add ovo']
 */
export function addonChoices(menu: MenuItem[], line: DraftLine): MenuItem[] {
  const parent = menu.find((item) => item.id === line.productId);
  const addonCategoryId = parent?.addonCategoryId ?? null;
  if (addonCategoryId === null) return [];
  return menu.filter((item) => item.categoryId === addonCategoryId);
}
