import { Check, Minus } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { formatAmount, formatMoney } from '../api/money';
import { Dialog } from '../components/Dialog';
import { choiceRemoved } from './line-removals';
import type { MenuItem } from './menu-lookup';
import { lineLabel, type DraftLine } from './order-lines';
import type { RemovalChoice } from './removal-lookup';
import type { OrderItemsState } from './use-order-items';
import { lineWithAddonsTotal } from './addon-line-total';

interface AddonDialogProps {
  line: DraftLine;
  /** Adicionais que a linha aceita (`addonChoices`); vazio = só a observação. */
  choices: MenuItem[];
  /** O que dá para tirar da linha (`removalChoices`); vazio = não mostra a seção. */
  removals: RemovalChoice[];
  /** As opções da escolha obrigatória (o pão, `choiceOptions`); vazio = não mostra a seção. */
  choiceOptions: MenuItem[];
  items: OrderItemsState;
  onClose(returnFocus: boolean): void;
  /**
   * No celular (2026-11-05): `false` desliga o foco automático na Observação para não abrir
   * o teclado virtual ao acessar o painel pelo botão. No desktop o padrão `true` mantém o
   * foco automático (pedido do usuário, 2026-10-11: a observação continua com foco).
   */
  autoFocusNote?: boolean;
}

function ChoiceKeyButton({
  option,
  index,
  active,
  onClick,
}: {
  option: MenuItem;
  index: number;
  active: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      className="toggle-key toggle-key-sm"
      aria-pressed={active}
      onClick={onClick}
    >
      <span aria-hidden className="kbd-hint">
        {index + 1}
      </span>
      {option.name}
    </button>
  );
}

/** Teclas do pão (2026-11-08), uma ligada, na ordem das teclas da pergunta; trocar é clicar. */
function ChoiceKeys({
  line,
  choiceOptions,
  items,
}: Pick<AddonDialogProps, 'line' | 'choiceOptions' | 'items'>) {
  const title = choiceOptions[0]?.categoryName ?? 'Escolha';
  return (
    <section className="addon-section" aria-label={title}>
      <h3>{title}</h3>
      <div className="removal-keys">
        {choiceOptions.map((option, index) => (
          <ChoiceKeyButton
            key={option.id}
            option={option}
            index={index}
            active={line.choice?.productId === option.id}
            onClick={() => items.chooseFor(line.id, option)}
          />
        ))}
      </div>
    </section>
  );
}

/** Teclas de alternar: a ligada saiu do lanche (a Salada tira alface e tomate juntos). */
function RemovalKeys({
  line,
  removals,
  items,
}: Pick<AddonDialogProps, 'line' | 'removals' | 'items'>) {
  return (
    <section className="addon-section" aria-label="Retirar">
      <h3>Retirar</h3>
      <div className="removal-keys">
        {removals.map((choice) => (
          <button
            key={choice.key}
            type="button"
            className="toggle-key toggle-key-sm"
            aria-label={`Retirar ${choice.label}`}
            aria-pressed={choiceRemoved(line, choice)}
            onClick={() => items.toggleRemoval(line.id, choice)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function AddonKeyMinus({
  choice,
  onClick,
}: {
  choice: MenuItem;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      className="toggle-key addon-key-minus"
      aria-label={`Menos ${choice.name}`}
      onClick={onClick}
    >
      <Minus aria-hidden />
    </button>
  );
}

interface AddonKeyProps {
  lineId: number;
  choice: MenuItem;
  count: number;
  items: OrderItemsState;
}

function AddonKeyItem({ lineId, choice, count, items }: AddonKeyProps) {
  const chosen = count > 0;
  return (
    <div className="addon-key-group" data-chosen={chosen}>
      <button
        type="button"
        className={`toggle-key addon-key ${chosen ? 'toggle-key-brand' : ''}`}
        aria-label={`Mais ${choice.name}`}
        aria-pressed={chosen}
        onClick={() => items.changeAddon(lineId, choice, 1)}
      >
        {chosen && <span className="addon-key-count">{count}×</span>}
        <span className="addon-key-name">{choice.name}</span>
        <span className="addon-key-price">
          +{formatAmount(choice.salePrice)}
        </span>
      </button>
      {chosen && (
        <AddonKeyMinus
          choice={choice}
          onClick={() => items.changeAddon(lineId, choice, -1)}
        />
      )}
    </div>
  );
}

function AddonKeysSection({
  line,
  choices,
  items,
}: Pick<AddonDialogProps, 'line' | 'choices' | 'items'>) {
  if (choices.length === 0) {
    return <p className="hint">Este item não aceita adicionais.</p>;
  }
  return (
    <section className="addon-section" aria-label="Adicionar">
      <h3>Adicionar</h3>
      <div className="addon-dialog-grid">
        {choices.map((choice) => {
          const count =
            line.addons.find((a) => a.productId === choice.id)?.quantity ?? 0;
          return (
            <AddonKeyItem
              key={choice.id}
              lineId={line.id}
              choice={choice}
              count={count}
              items={items}
            />
          );
        })}
      </div>
    </section>
  );
}

interface NoteFieldProps {
  value: string;
  autoFocusNote: boolean;
  onChange(value: string): void;
  onDone(): void;
}

/** Observação da linha; Enter = "Pronto" (sem o atalho do formulário pular de campo). */
function NoteField({ value, autoFocusNote, onChange, onDone }: NoteFieldProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onDone();
  };
  return (
    <label className="field">
      Observação
      <input
        maxLength={120}
        placeholder="sem tomate, bem passado…"
        data-autofocus={autoFocusNote || undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

function AddonDialogDone({ onDone }: { onDone(): void }) {
  return (
    <div className="dialog-actions">
      <button
        type="button"
        className="button button-secondary button-sm"
        onClick={onDone}
      >
        <Check aria-hidden />
        Pronto
      </button>
    </div>
  );
}

/**
 * Janela modal de adicionais, opções de pão, retiradas e observação de uma linha da comanda.
 * A observação só é gravada ao fechar ("Pronto", Enter, Esc ou clique fora), para o espaço
 * digitado não ser aparado no meio da frase.
 *
 * @example <AddonDialog line={line} choices={choices} removals={[]} choiceOptions={[]} items={items} onClose={close} />
 */
export function AddonDialog({
  line,
  choices,
  removals,
  choiceOptions,
  items,
  onClose,
  autoFocusNote = true,
}: AddonDialogProps) {
  const [note, setNote] = useState(line.note);
  const close = (returnFocus: boolean) => {
    items.setNote(line.id, note);
    onClose(returnFocus);
  };
  const title = lineLabel(items.lines, line);
  const total = formatMoney(lineWithAddonsTotal(line));

  return (
    <Dialog
      title={title}
      className="addon-dialog"
      restoreFocus={false}
      aside={<span className="addon-dialog-total">{total}</span>}
      onClose={(reason) => close(reason !== 'backdrop')}
    >
      <div className="addon-dialog-body">
        {choiceOptions.length > 0 && (
          <ChoiceKeys line={line} choiceOptions={choiceOptions} items={items} />
        )}
        {removals.length > 0 && (
          <RemovalKeys line={line} removals={removals} items={items} />
        )}
        <AddonKeysSection line={line} choices={choices} items={items} />
        <NoteField
          value={note}
          autoFocusNote={autoFocusNote}
          onChange={setNote}
          onDone={() => close(true)}
        />
        <AddonDialogDone onDone={() => close(true)} />
      </div>
    </Dialog>
  );
}
