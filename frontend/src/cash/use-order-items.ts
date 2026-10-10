import { useState } from 'react';
import { parseItemCommand } from './item-command';
import { applyEnter, applyPick, type EnterResult } from './item-enter';
import { previewOf, type ItemPreview } from './item-preview';
import { changeAddon, setNote } from './line-addons';
import type { MenuItem } from './menu-lookup';
import { adjustLast, changeQuantity, type DraftLine } from './order-lines';

export interface OrderItemsState {
  lines: DraftLine[];
  /** Campo Qtd (só algarismos; '' = 1), que vale quando o Item não traz "2*". */
  quantity: string;
  setQuantity(text: string): void;
  /** Tecla que não é número no Qtd: o Item começa com `text` e o Qtd fica com `quantity`. */
  startItem(text: string, quantity: string): void;
  text: string;
  preview: ItemPreview;
  /** Aviso do último Enter que não deu certo (some ao digitar). */
  problem: string | null;
  setText(text: string): void;
  /** Setas na lista da busca. */
  moveActive(delta: 1 | -1): void;
  /** Enter no campo: 'added' pôs algo; 'done' = campo vazio (seguir para o pagamento). */
  enter(): EnterResult;
  /** Põe direto um item da lista (clique), com a quantidade digitada ("2*coca"). */
  pick(item: MenuItem): void;
  adjustLast(delta: 1 | -1): void;
  changeQuantity(lineId: number, delta: number): void;
  /** Põe (1) ou tira (-1) um adicional, por unidade, de uma linha. */
  changeAddon(lineId: number, item: MenuItem, delta: number): void;
  setNote(lineId: number, text: string): void;
  reset(lines: DraftLine[]): void;
}

const MAX_QUANTITY_DIGITS = 2;

/** O que o caixa digitou no Qtd: só algarismos, até 2. */
const onlyQuantityDigits = (value: string) =>
  value.replace(/\D/g, '').slice(0, MAX_QUANTITY_DIGITS);

/** Qtd vazio ou zero vale 1. */
const typedQuantity = (value: string) => Math.max(1, Number(value) || 1);

/**
 * Linhas da comanda, o campo Qtd e o campo "Item" (número, artesanal com ponto, quantidade
 * com * ou nome).
 *
 * @example const items = useOrderItems(menu, []); items.setText('9'); items.enter();
 */
export function useOrderItems(
  menu: MenuItem[],
  initial: DraftLine[],
): OrderItemsState {
  const [lines, setLines] = useState(initial);
  const [quantity, setQuantityState] = useState('');
  const [text, setTextState] = useState('');
  const [active, setActive] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const command = parseItemCommand(text, typedQuantity(quantity));
  const preview = previewOf(command, menu, active, lines.at(-1));

  const clearText = () => {
    setTextState('');
    setQuantityState('');
    setActive(0);
    setProblem(null);
  };

  const enter = (): EnterResult => {
    const outcome = applyEnter(command, preview, lines);
    if (outcome.result === 'problem') {
      setProblem(outcome.problem);
      return 'problem';
    }
    setLines(outcome.lines);
    if (outcome.result === 'added') clearText();
    return outcome.result;
  };

  return {
    lines,
    quantity,
    setQuantity: (value) => setQuantityState(onlyQuantityDigits(value)),
    startItem: (itemText, nextQuantity) => {
      setQuantityState(nextQuantity);
      setTextState(itemText);
      setActive(0);
      setProblem(null);
    },
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
    pick: (item) => {
      setLines((current) => applyPick(preview, item, current));
      clearText();
    },
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
