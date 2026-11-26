import { addonChoices } from './addon-lookup';
import { choiceOptions } from './line-choice';
import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';
import { removalChoices } from './removal-lookup';

export interface AddonKeyLabel {
  text: 'Adicionais' | 'Observação';
  count: number;
}

/**
 * Rótulo e quantidade da tecla de adicionais na linha da comanda.
 * Diz "Observação" quando o item não tem adicional, retirada nem pão.
 *
 * @example addonKeyLabel(line, menu) // { text: 'Adicionais', count: 3 }
 */
export function addonKeyLabel(
  line: DraftLine,
  menu: MenuItem[],
): AddonKeyLabel {
  const count = line.addons.reduce((sum, a) => sum + a.quantity, 0);
  const hasOptions =
    addonChoices(menu, line).length > 0 ||
    removalChoices(menu, line).length > 0 ||
    choiceOptions(menu, line).length > 0;
  return {
    text: hasOptions ? 'Adicionais' : 'Observação',
    count,
  };
}
