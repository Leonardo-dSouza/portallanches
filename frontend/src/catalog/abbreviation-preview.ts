import type { TicketAbbreviation } from '../api/types';
import { withoutAddPrefix } from '../cash/item-tree';
import { abbreviate } from '../print/abbreviate';

/** Um nome do cardápio antes e depois das abreviações. */
export interface PaperNameChange {
  before: string;
  after: string;
}

/**
 * Prévia da aba Comanda: os nomes do cardápio que mudam no papel, uma vez cada (tradicional e
 * artesanal repetem o nome). O adicional aparece sem o "Add ", como sai embaixo do lanche.
 *
 * @example paperNameChanges(['Leite em pó'], [{ from: 'Leite em pó', to: 'LP' }]) // [{ before: 'Leite em pó', after: 'LP' }]
 */
export function paperNameChanges(
  names: string[],
  rules: TicketAbbreviation[],
): PaperNameChange[] {
  const unique = [...new Set(names.map(withoutAddPrefix))];
  return unique
    .map((before) => ({ before, after: abbreviate(before, rules) }))
    .filter((change) => change.after !== change.before);
}
