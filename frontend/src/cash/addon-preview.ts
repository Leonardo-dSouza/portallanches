import { addonChoices } from './addon-lookup';
import type { ItemCommand } from './item-command';
import type { ItemPreview } from './item-preview';
import { searchMenu, type MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';
import { removalChoices, searchRemovals } from './removal-lookup';

const clampIndex = (index: number, length: number) =>
  Math.max(0, Math.min(index, length - 1));

/**
 * Prévia do "+bacon": os adicionais aceitos pela última linha que casam com o texto, ou o
 * aviso do porquê não dá.
 *
 * @example addonPreview({ kind: 'addon', query: 'bac' }, menu, 0, lastLine).kind // 'addons'
 */
export function addonPreview(
  command: Extract<ItemCommand, { kind: 'addon' }>,
  menu: MenuItem[],
  active: number,
  line: DraftLine | undefined,
): ItemPreview {
  if (!line)
    return { kind: 'problem', message: 'Lance o lanche antes do adicional' };
  const choices = addonChoices(menu, line);
  if (choices.length === 0)
    return { kind: 'problem', message: `"${line.name}" não aceita adicionais` };
  const items = searchMenu(choices, command.query);
  if (items.length === 0)
    return {
      kind: 'problem',
      message: `Nenhum adicional com "${command.query}" para "${line.name}"`,
    };
  return {
    kind: 'addons',
    items,
    active: clampIndex(active, items.length),
    line,
  };
}

/**
 * Prévia do "-tomate": os ingredientes da última linha que casam com o texto, ou o aviso do
 * porquê não dá.
 *
 * @example removalPreview({ kind: 'removal', query: 'tom' }, menu, 0, lastLine).kind // 'removals'
 */
export function removalPreview(
  command: Extract<ItemCommand, { kind: 'removal' }>,
  menu: MenuItem[],
  active: number,
  line: DraftLine | undefined,
): ItemPreview {
  if (!line)
    return { kind: 'problem', message: 'Lance o lanche antes de retirar' };
  const all = removalChoices(menu, line);
  if (all.length === 0)
    return {
      kind: 'problem',
      message: `"${line.name}" não tem ingrediente para retirar`,
    };
  const choices = searchRemovals(all, command.query);
  if (choices.length === 0)
    return {
      kind: 'problem',
      message: `Nenhum ingrediente com "${command.query}" em "${line.name}"`,
    };
  return {
    kind: 'removals',
    choices,
    active: clampIndex(active, choices.length),
    line,
  };
}

/**
 * Prévia do "/sem tomate": a observação que o Enter grava na última linha.
 *
 * @example notePreview({ kind: 'note', note: 'sem tomate' }, lastLine).kind // 'note'
 */
export function notePreview(
  command: Extract<ItemCommand, { kind: 'note' }>,
  line: DraftLine | undefined,
): ItemPreview {
  if (!line)
    return { kind: 'problem', message: 'Lance o item antes da observação' };
  return { kind: 'note', note: command.note, line };
}
