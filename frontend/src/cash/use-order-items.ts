import { useMemo, useState } from 'react';
import {
  choicePreview,
  lineToAsk,
  pendingChoiceMessage,
} from './choice-prompt';
import { parseItemCommand } from './item-command';
import { applyEnter, applyPick, type EnterResult } from './item-enter';
import { previewOf, type ItemPreview } from './item-preview';
import { changeAddon, setNote } from './line-addons';
import {
  choiceOptions,
  choiceSubject,
  firstPendingChoice,
  sellableMenu,
  setChoice,
} from './line-choice';
import { toggleRemoval } from './line-removals';
import type { MenuItem } from './menu-lookup';
import {
  adjustLast,
  changeQuantity,
  restoreSavedLine,
  type DraftLine,
} from './order-lines';
import type { RemovalChoice } from './removal-lookup';

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
  /** Clique numa opção do "-tomate": vale para a última linha e limpa o campo. */
  pickRemoval(choice: RemovalChoice): void;
  adjustLast(delta: 1 | -1): void;
  changeQuantity(lineId: number, delta: number): void;
  /** Põe (1) ou tira (-1) um adicional, por unidade, de uma linha. */
  changeAddon(lineId: number, item: MenuItem, delta: number): void;
  setNote(lineId: number, text: string): void;
  /** Tira o ingrediente da linha ou, se já saiu, devolve. */
  toggleRemoval(lineId: number, choice: RemovalChoice): void;
  /** Desfaz a saída de uma linha do pedido salvo (edição). */
  restoreLine(line: DraftLine): void;
  /** Escolhe a opção `index` (tecla 1 = 0) na pergunta aberta; falso se não há essa opção. */
  choose(index: number): boolean;
  /** Põe ou troca a escolha de uma linha (painel F4). */
  chooseFor(lineId: number, option: MenuItem): void;
  /** Esc na pergunta: a linha fica pendente ("Escolha o pão" em vermelho). */
  skipChoice(): void;
  /** Abre a pergunta da 1ª linha pendente e devolve o aviso; null = nada falta. */
  askPending(): string | null;
  reset(lines: DraftLine[]): void;
}

const MAX_QUANTITY_DIGITS = 2;

/** O que o caixa digitou no Qtd: só algarismos, até 2. */
const onlyQuantityDigits = (value: string) =>
  value.replace(/\D/g, '').slice(0, MAX_QUANTITY_DIGITS);

/** Qtd vazio ou zero vale 1. */
const typedQuantity = (value: string) => Math.max(1, Number(value) || 1);

/** Última opção que as setas alcançam na lista aberta. */
function lastOption(preview: ItemPreview): number {
  if (preview.kind === 'results') return preview.items.length - 1;
  if (preview.kind === 'choice') return preview.options.length - 1;
  return preview.kind === 'removals' ? preview.choices.length - 1 : 0;
}

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
  // A linha cuja escolha (o pão, 2026-11-08) está sendo perguntada; null = nenhuma.
  const [askingId, setAskingId] = useState<number | null>(null);
  const sellable = useMemo(() => sellableMenu(menu), [menu]);
  const command = parseItemCommand(text, typedQuantity(quantity));
  const asking = lines.find((line) => line.id === askingId);
  const preview =
    choicePreview(menu, asking, active) ??
    previewOf(command, sellable, active, lines.at(-1));

  const askFor = (line: DraftLine | undefined) => {
    if (!line) return;
    setAskingId(line.id);
    setActive(0);
  };

  /** Troca as linhas e, se entrou uma que pede o pão, abre a pergunta. */
  const commitLines = (next: DraftLine[]) => {
    askFor(lineToAsk(lines, next, menu));
    setLines(next);
  };

  const askPending = (): string | null => {
    const line = firstPendingChoice(lines, menu, initial);
    if (!line) return null;
    askFor(line);
    const subject = choiceSubject(choiceOptions(menu, line));
    const message = pendingChoiceMessage(subject, line.name);
    setProblem(message);
    return message;
  };

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
    // Enter vazio segue para o pagamento só sem pão faltando (2026-11-08).
    if (outcome.result === 'done' && askPending()) return 'problem';
    commitLines(outcome.lines);
    if (outcome.result === 'added') clearText();
    return outcome.result;
  };

  const choose = (index: number): boolean => {
    const option = preview.kind === 'choice' ? preview.options[index] : null;
    if (!option || preview.kind !== 'choice') return false;
    setLines(setChoice(lines, preview.line.id, option));
    setAskingId(null);
    setActive(0);
    setProblem(null);
    return true;
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
      setActive((current) =>
        Math.max(0, Math.min(current + delta, lastOption(preview))),
      );
    },
    enter,
    pick: (item) => {
      commitLines(applyPick(preview, item, lines));
      clearText();
    },
    pickRemoval: (choice) => {
      if (preview.kind === 'removals')
        setLines((current) => toggleRemoval(current, preview.line.id, choice));
      clearText();
    },
    adjustLast: (delta) => setLines((current) => adjustLast(current, delta)),
    changeQuantity: (lineId, delta) =>
      setLines((current) => changeQuantity(current, lineId, delta)),
    changeAddon: (lineId, item, delta) =>
      setLines((current) => changeAddon(current, lineId, item, delta)),
    setNote: (lineId, text) =>
      setLines((current) => setNote(current, lineId, text)),
    toggleRemoval: (lineId, choice) =>
      setLines((current) => toggleRemoval(current, lineId, choice)),
    restoreLine: (line) =>
      setLines((current) => restoreSavedLine(current, line)),
    choose,
    chooseFor: (lineId, option) => {
      setLines((current) => setChoice(current, lineId, option));
      if (lineId === askingId) setAskingId(null);
      setProblem(null);
    },
    skipChoice: () => {
      setAskingId(null);
      setActive(0);
    },
    askPending,
    reset: (next) => {
      setLines(next);
      setAskingId(null);
      clearText();
    },
  };
}
