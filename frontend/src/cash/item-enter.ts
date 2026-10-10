import type { ItemCommand } from './item-command';
import { chosenItem, optionsOf, type ItemPreview } from './item-preview';
import { changeAddon, setNote } from './line-addons';
import type { MenuItem } from './menu-lookup';
import { addLine, adjustLast, type DraftLine } from './order-lines';

export type EnterResult = 'added' | 'done' | 'problem';

export interface EnterOutcome {
  result: EnterResult;
  lines: DraftLine[];
  /** Aviso do Enter que não deu certo; null nos outros casos. */
  problem: string | null;
}

const added = (lines: DraftLine[]): EnterOutcome => ({
  result: 'added',
  lines,
  problem: null,
});

/**
 * Clique numa opção da lista: o adicional vai para a última linha; o item vira linha, com a
 * quantidade digitada ("2*coca").
 *
 * @example applyPick(preview, bacon, lines)
 */
export function applyPick(
  preview: ItemPreview,
  item: MenuItem,
  lines: DraftLine[],
): DraftLine[] {
  if (preview.kind === 'addons')
    return changeAddon(lines, preview.line.id, item, 1);
  return addLine(lines, item, optionsOf(preview)?.quantity ?? 1);
}

/**
 * O que o Enter faz com o que foi digitado: vazio segue para o pagamento, "+"/"-" ajustam, o
 * adicional e a observação vão para a última linha, e o item vira linha.
 *
 * @example applyEnter(command, preview, lines).result // 'added'
 */
export function applyEnter(
  command: ItemCommand,
  preview: ItemPreview,
  lines: DraftLine[],
): EnterOutcome {
  if (command.kind === 'empty') return { result: 'done', lines, problem: null };
  if (command.kind === 'adjust') return added(adjustLast(lines, command.delta));
  if (preview.kind === 'note')
    return added(setNote(lines, preview.line.id, preview.note));
  const item = chosenItem(preview);
  if (item) return added(applyPick(preview, item, lines));
  const problem = preview.kind === 'problem' ? preview.message : null;
  return { result: 'problem', lines, problem };
}
