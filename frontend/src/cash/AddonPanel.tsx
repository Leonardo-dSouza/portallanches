import { Check, Minus, Plus } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { formatMoney } from '../api/money';
import { useDismiss } from '../calendar/use-dismiss';
import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';
import type { OrderItemsState } from './use-order-items';

interface AddonPanelProps {
  line: DraftLine;
  /** Adicionais que a linha aceita (`addonChoices`); vazio = só a observação. */
  choices: MenuItem[];
  items: OrderItemsState;
  onClose(returnFocus: boolean): void;
}

function ChoiceRow({
  line,
  choice,
  items,
}: {
  line: DraftLine;
  choice: MenuItem;
  items: OrderItemsState;
}) {
  const count =
    line.addons.find((a) => a.productId === choice.id)?.quantity ?? 0;
  const change = (delta: number) => items.changeAddon(line.id, choice, delta);
  return (
    <li className="addon-choice" data-chosen={count > 0}>
      <span className="addon-choice-name">{choice.name}</span>
      <span className="addon-choice-price">
        {formatMoney(choice.salePrice)}
      </span>
      <button
        type="button"
        className="button-ghost button-sm"
        aria-label={`Menos ${choice.name}`}
        disabled={count === 0}
        onClick={() => change(-1)}
      >
        <Minus aria-hidden />
      </button>
      <span
        className="addon-choice-count"
        aria-label={`${count} ${choice.name}`}
      >
        {count}
      </span>
      <button
        type="button"
        className="button-ghost button-sm"
        aria-label={`Mais ${choice.name}`}
        onClick={() => change(1)}
      >
        <Plus aria-hidden />
      </button>
    </li>
  );
}

interface NoteFieldProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange(value: string): void;
  onDone(): void;
}

/** Observação da linha; Enter = "Pronto" (sem o atalho do formulário pular de campo). */
function NoteField({ inputRef, value, onChange, onDone }: NoteFieldProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onDone();
  };
  return (
    <label className="field">
      Observação
      <input
        ref={inputRef}
        maxLength={120}
        placeholder="sem tomate, bem passado…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

/**
 * Adicionais (−/+) e observação de uma linha. A observação só é gravada ao fechar ("Pronto",
 * Enter, Esc ou clique fora), para o espaço digitado não ser aparado no meio da frase.
 */
export function AddonPanel({ line, choices, items, onClose }: AddonPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState(line.note);
  const close = (returnFocus: boolean) => {
    items.setNote(line.id, note);
    onClose(returnFocus);
  };
  useDismiss(containerRef, (reason) => close(reason === 'escape'));
  useEffect(() => {
    const first = containerRef.current?.querySelector<HTMLButtonElement>(
      '.addon-choice button:not(:disabled)',
    );
    (first ?? noteRef.current)?.focus();
  }, []);
  return (
    <div
      ref={containerRef}
      className="addon-panel"
      role="dialog"
      aria-label={`Adicionais de ${line.name}`}
    >
      {choices.length > 0 ? (
        <ul className="addon-choices">
          {choices.map((choice) => (
            <ChoiceRow
              key={choice.id}
              line={line}
              choice={choice}
              items={items}
            />
          ))}
        </ul>
      ) : (
        <p className="hint">Este item não aceita adicionais.</p>
      )}
      <NoteField
        inputRef={noteRef}
        value={note}
        onChange={setNote}
        onDone={() => close(true)}
      />
      <button
        type="button"
        className="button button-secondary button-sm"
        onClick={() => close(true)}
      >
        <Check aria-hidden />
        Pronto
      </button>
    </div>
  );
}
