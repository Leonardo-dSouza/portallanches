import type { BeverageLayout } from '../beverage-import/beverage-layout.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import type { MenuMapping } from '../menu-import/menu-types.js';

/** Token das chaves das categorias que as planilhas importam (não podem mudar de nome). */
export const IMPORTED_CATEGORY_KEYS = Symbol('IMPORTED_CATEGORY_KEYS');

/**
 * Chaves (`name_key`) das categorias que a importação procura pelo nome: renomear uma delas
 * faria a próxima importação parar ("categoria não existe").
 *
 * @example importedCategoryKeys(parseMenuMapping(CARDAPIO_MAPPING), BEVERAGE_LAYOUT).has('tradicional') // true
 */
export function importedCategoryKeys(
  mapping: MenuMapping,
  layout: BeverageLayout,
): ReadonlySet<string> {
  const names = [
    ...mapping.groups.map((group) => group.category),
    ...layout.blocks.map((block) => block.category),
  ];
  return new Set(names.map(toNeighborhoodKey));
}
