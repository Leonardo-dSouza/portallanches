import { useState } from 'react';
import { parseItemCommand } from './item-command';
import {
  chosenItem,
  optionsOf,
  previewOf,
  type ItemPreview,
} from './item-preview';
import { changeAddon, setNote } from './line-addons';
import type { MenuItem } from './menu-lookup';
import {
  addLine,
  adjustLast,
  changeQuantity,
  type DraftLine,
} from './order-lines';

export interface OrderItemsState {
  lines: DraftLine[];
  text: string;
  preview: ItemPreview;
  /** Aviso do último Enter que não deu certo (some ao digitar). */
  problem: string | null;
  setText(text: string): void;
  /** Setas na lista da busca. */
  moveActive(delta: 1 | -1): void;
  /** Enter no campo: 'added' pôs um item; 'done' = campo vazio (seguir para o pagamento). */
  enter(): 'added' | 'done' | 'problem';
  /** Põe direto um item da lista (clique), com a quantidade digitada ("2*coca"). */
  pick(item: MenuItem): void;
  adjustLast(delta: 1 | -1): void;
  changeQuantity(lineId: number, delta: number): void;
  /** Põe (1) ou tira (-1) um adicional, por unidade, de uma linha. */
  changeAddon(lineId: number, item: MenuItem, delta: number): void;
  setNote(lineId: number, text: string): void;
  reset(lines: DraftLine[]): void;
}

/**
 * Linhas da comanda e o campo "Item" (número, artesanal com ponto, quantidade com * ou nome).
 *
 * @example const items = useOrderItems(menu, []); items.setText('9'); items.enter();
 */
export function useOrderItems(
  menu: MenuItem[],
  initial: DraftLine[],
): OrderItemsState {
  const [lines, setLines] = useState(initial);
  const [text, setTextState] = useState('');
  const [active, setActive] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const command = parseItemCommand(text);
  const preview = previewOf(command, menu, active);

  const clearText = () => {
    setTextState('');
    setActive(0);
    setProblem(null);
  };
  const add = (item: MenuItem, quantity: number) => {
    setLines((current) => addLine(current, item, quantity));
    clearText();
  };

  const enter = (): 'added' | 'done' | 'problem' => {
    if (command.kind === 'empty') return 'done';
    if (command.kind === 'adjust') {
      setLines((current) => adjustLast(current, command.delta));
      clearText();
      return 'added';
    }
    const item = chosenItem(preview);
    if (!item) {
      setProblem(preview.kind === 'problem' ? preview.message : null);
      return 'problem';
    }
    add(item, 'quantity' in preview ? preview.quantity : 1);
    return 'added';
  };

  return {
    lines,
    text,
    preview,
    problem,
    setText: (value) => {
      setTextState(value);
      setActive(0);
      setProblem(null);
    },
    moveActive: (delta) => {
      const last = preview.kind === 'results' ? preview.items.length - 1 : 0;
      setActive((current) => Math.max(0, Math.min(current + delta, last)));
    },
    enter,
    pick: (item) => add(item, optionsOf(preview)?.quantity ?? 1),
    adjustLast: (delta) => setLines((current) => adjustLast(current, delta)),
    changeQuantity: (lineId, delta) =>
      setLines((current) => changeQuantity(current, lineId, delta)),
    changeAddon: (lineId, item, delta) =>
      setLines((current) => changeAddon(current, lineId, item, delta)),
    setNote: (lineId, text) =>
      setLines((current) => setNote(current, lineId, text)),
    reset: (next) => {
      setLines(next);
      clearText();
    },
  };
}
