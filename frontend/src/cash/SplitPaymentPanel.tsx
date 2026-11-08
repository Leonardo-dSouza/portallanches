import { X } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import { centsToMoney, formatMoney } from '../api/money';
import type { PaymentMethod, PaymentMode } from '../api/types';
import { TextField } from '../components/TextField';
import { focusChoice, pressNumberKey } from './choice-keys';
import { PaymentModeKeys } from './PaymentModeKeys';
import {
  appendRemainingPart,
  carryHintOf,
  splitDifferenceCents,
  splitDifferenceLabel,
  type SplitPartDraft,
} from './split-payment';

export interface SplitPaymentPanelProps {
  totalCents: number;
  /** As formas do caixa; a Fiado e as inativas ficam de fora aqui (fiado não divide). */
  methods: PaymentMethod[];
  parts: SplitPartDraft[];
  /** O "Troco para" só existe onde a API aceita: entrega e Receber do A pagar (o balcão não). */
  allowChange: boolean;
  changeFor: string;
  onChange(parts: SplitPartDraft[]): void;
  onChangeFor(changeFor: string): void;
  onCancel(): void;
  onSubmit(): void;
}

/** Onde o foco vai numa linha: nas teclas da forma, nas do meio ou no Valor. */
type PartTarget = 'keys' | 'mode' | 'amount';

const PART_SELECTOR: Record<PartTarget, string> = {
  keys: '.split-part-keys',
  mode: '.payment-mode-keys',
  amount: '.split-part-amount input',
};

/**
 * Leva o foco a uma parte do painel pelo DOM (e não por uma ref por linha: o React Compiler
 * recusa otimizar quando a função lê refs guardadas numa lista).
 */
function focusPart(
  panel: HTMLElement | null,
  index: number,
  target: PartTarget,
): void {
  const row = panel?.querySelector<HTMLElement>(`[data-part="${index}"]`);
  const element = row?.querySelector<HTMLElement>(PART_SELECTOR[target]);
  if (target === 'amount') return element?.focus();
  focusChoice(element ?? null);
}

interface PartMethodKeysProps {
  methods: PaymentMethod[];
  selectedId: string;
  index: number;
  onChoose(method: PaymentMethod): void;
  onDone(): void;
}

/** Teclas da forma de uma linha (1 a N, sem Fiado); Enter segue para o Valor. */
function PartMethodKeys(props: PartMethodKeysProps) {
  const { methods, selectedId, index } = props;
  const handleKey = (event: KeyboardEvent<HTMLFieldSetElement>) =>
    pressNumberKey(
      event,
      methods.length,
      (position) => props.onChoose(methods[position]),
      props.onDone,
    );
  return (
    <fieldset className="payment-keys split-part-keys" onKeyDown={handleKey}>
      <legend className="sr-only">Forma da parte {index + 1}</legend>
      {methods.map((method, position) => (
        <label
          key={method.id}
          className="toggle-key toggle-key-sm"
          data-checked={selectedId === String(method.id)}
        >
          <input
            type="radio"
            aria-label={`${method.name} parte ${index + 1}`}
            name={`split-part-${index}`}
            checked={selectedId === String(method.id)}
            onChange={() => props.onChoose(method)}
          />
          <kbd aria-hidden className="kbd-hint">
            {position + 1}
          </kbd>
          {method.name}
        </label>
      ))}
    </fieldset>
  );
}

interface SplitPartRowProps {
  part: SplitPartDraft;
  index: number;
  methods: PaymentMethod[];
  showChange: boolean;
  changeFor: string;
  onChange(part: SplitPartDraft): void;
  onChangeFor(changeFor: string): void;
  onRemove(): void;
  /** Leva o foco a um alvo desta linha. */
  onFocus(target: PartTarget): void;
  /** Enter no Valor: abre a próxima linha ou salva quando não falta nada. */
  onAmountDone(): void;
  onSubmit(): void;
}

/** O "Troco para" da parte em dinheiro, com o que o motoboy leva. */
function PartChangeField(props: {
  changeFor: string;
  cashAmount: string;
  onChangeFor(changeFor: string): void;
  onSubmit(): void;
}) {
  const carry = carryHintOf(props.changeFor, props.cashAmount);
  return (
    <div className="split-cash-troco">
      <TextField
        label="Troco para"
        inputMode="decimal"
        placeholder="Vazio = sem troco"
        value={props.changeFor}
        onChange={props.onChangeFor}
        onKeyDown={(event) => submitOnEnter(event, props.onSubmit)}
      />
      {carry && <span className="split-carry-hint">{carry}</span>}
    </div>
  );
}

function submitOnEnter(
  event: KeyboardEvent<HTMLInputElement>,
  submit: () => void,
): void {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  event.stopPropagation();
  submit();
}

/** Uma linha: forma, meio da maquininha, valor e, na parte em dinheiro, o troco. */
function SplitPartRow(props: SplitPartRowProps) {
  const { part, index, methods, onChange, onFocus } = props;
  const selected = methods.find((m) => String(m.id) === part.paymentMethodId);
  const chooseMethod = (method: PaymentMethod) => {
    onChange({ ...part, paymentMethodId: String(method.id), paymentMode: '' });
    // O meio só existe depois de renderizar: o foco vai no próximo quadro.
    requestAnimationFrame(() =>
      onFocus(method.isCardTerminal ? 'mode' : 'amount'),
    );
  };
  const chooseMode = (mode: PaymentMode) => {
    onChange({ ...part, paymentMode: mode });
    onFocus('amount');
  };
  return (
    <div className="split-part-row" data-part={index}>
      <div className="split-part-main">
        <PartMethodKeys
          methods={methods}
          selectedId={part.paymentMethodId}
          index={index}
          onChoose={chooseMethod}
          onDone={() => onFocus('amount')}
        />
        {selected?.isCardTerminal && (
          <PaymentModeKeys
            terminal={selected.name}
            value={part.paymentMode}
            onChange={chooseMode}
            onSubmit={() => onFocus('amount')}
          />
        )}
      </div>
      <SplitPartValues {...props} cash={selected?.isCash === true} />
    </div>
  );
}

/** O Valor da linha, o troco (só na parte em dinheiro, onde vale) e a tecla de tirar a linha. */
function SplitPartValues(props: SplitPartRowProps & { cash: boolean }) {
  const { part, index, onChange } = props;
  return (
    <div className="split-part-values">
      <div className="split-part-amount">
        <TextField
          label={`Valor parte ${index + 1}`}
          inputMode="decimal"
          placeholder="0,00"
          value={part.amount}
          onChange={(amount) => onChange({ ...part, amount })}
          onKeyDown={(event) => submitOnEnter(event, props.onAmountDone)}
        />
      </div>
      {props.cash && props.showChange && (
        <PartChangeField
          changeFor={props.changeFor}
          cashAmount={part.amount}
          onChangeFor={props.onChangeFor}
          onSubmit={props.onSubmit}
        />
      )}
      <button
        type="button"
        className="button-ghost button-sm split-remove-btn"
        aria-label={`Tirar parte ${index + 1}`}
        title="Tirar parte"
        onClick={props.onRemove}
      >
        <X aria-hidden />
      </button>
    </div>
  );
}

/** Ao abrir: com a forma herdada, o foco vai ao Valor; sem ela, às teclas da forma. */
function useFocusOnOpen(
  panelRef: RefObject<HTMLDivElement | null>,
  firstHasMethod: boolean,
): void {
  // Só na montagem: depois disso o foco segue o teclado do caixa.
  const initial = useRef(firstHasMethod);
  useEffect(() => {
    focusPart(panelRef.current, 0, initial.current ? 'amount' : 'keys');
  }, [panelRef]);
}

/**
 * Painel "Dividir R$ X" (card 2, 2026-11-08): as partes que somam o total do pedido. Enter no
 * Valor abre a próxima linha com o que falta; sem falta, salva. Esc fecha e volta para uma forma.
 * O problema (falta forma, sobra…) aparece no erro do formulário, ao tentar salvar.
 *
 * @example <SplitPaymentPanel totalCents={5000} methods={methods} parts={parts} allowChange … />
 */
export function SplitPaymentPanel(props: SplitPaymentPanelProps) {
  const { totalCents, parts, onChange } = props;
  const panelRef = useRef<HTMLDivElement>(null);
  const methods = props.methods.filter((m) => m.active && !m.isFiado);
  useFocusOnOpen(panelRef, parts[0]?.paymentMethodId !== '');
  const amountDone = (index: number) => {
    if (splitDifferenceCents(totalCents, parts) <= 0) return props.onSubmit();
    if (index < parts.length - 1)
      return focusPart(panelRef.current, index + 1, 'keys');
    onChange(appendRemainingPart(parts, totalCents));
    requestAnimationFrame(() =>
      focusPart(panelRef.current, parts.length, 'keys'),
    );
  };
  const cancelOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    props.onCancel();
  };
  return (
    <div
      ref={panelRef}
      className="split-payment-panel"
      onKeyDown={cancelOnEscape}
      role="group"
      aria-label="Pagamento dividido"
    >
      <div className="split-panel-header">
        <h3>Dividir {formatMoney(centsToMoney(totalCents))}</h3>
        <span className="split-diff-badge" role="status">
          {splitDifferenceLabel(totalCents, parts)}
        </span>
      </div>
      <div className="split-parts-list">
        {parts.map((part, index) => (
          <SplitPartRow
            key={index}
            part={part}
            index={index}
            methods={methods}
            showChange={props.allowChange}
            changeFor={props.changeFor}
            onChange={(updated) => onChange(parts.with(index, updated))}
            onChangeFor={props.onChangeFor}
            onRemove={() => onChange(parts.filter((_, i) => i !== index))}
            onFocus={(target) => focusPart(panelRef.current, index, target)}
            onAmountDone={() => amountDone(index)}
            onSubmit={props.onSubmit}
          />
        ))}
      </div>
    </div>
  );
}
