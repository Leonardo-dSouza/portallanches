import { useRef, type KeyboardEvent, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { PaymentMethod, PaymentMode } from '../api/types';
import { useAppSettings } from '../settings/app-settings-context';
import { focusChoice, pressNumberKey } from './choice-keys';
import { OPEN_ACCOUNT, SPLIT } from './payment-choice';
import {
  numberedPaymentKeys,
  type NumberedPaymentKey,
  type SpecialKeyKind,
} from './payment-key-row';
import { PaymentModeKeys } from './PaymentModeKeys';

interface PaymentKeysProps {
  methods: PaymentMethod[];
  value: string;
  /** Meio na maquininha (só quando a forma escolhida é maquininha). */
  mode: PaymentMode | '';
  onChange(value: string): void;
  onModeChange(mode: PaymentMode): void;
  /** Enter no pagamento salva o pedido. */
  onSubmit(): void;
  /** Quem leva o foco às teclas (o formulário); a pergunta do acréscimo não precisa. */
  groupRef?: RefObject<HTMLFieldSetElement | null>;
  /** Só no balcão: a tecla 0 deixa a conta aberta e chama isto (o foco vai ao Nome). */
  onOpenChosen?(): void;
  /** Escolheu a forma "Dinheiro" (na entrega, o foco vai ao "Troco para"). */
  onCashChosen?(): void;
  /** Escolheu a forma fiado (no balcão, o foco vai ao Telefone do cliente). */
  onFiadoChosen?(): void;
  /** Tecla D: dividir o pagamento em duas ou mais partes (card 2); só onde dividir vale. */
  onSplitChosen?(): void;
  /** Numa janela (Receber do A pagar, card 8): a 1ª tecla ganha o foco quando ela abre. */
  autoFocus?: boolean;
}

const OPEN_KEY = '0';
const SPLIT_KEY = 'D';

/** Nome e letra de cada tecla especial (as letras valem junto do número da posição). */
const SPECIAL_KEYS: Record<SpecialKeyKind, { label: string; letter: string }> =
  {
    // Tecla 0 do balcão: a conta fica aberta no nome e é paga no fim (2026-10-10). Chama
    // "A pagar" desde 2026-10-11: "Aberto" se confundia com o dia aberto do cabeçalho.
    openAccount: { label: 'A pagar', letter: OPEN_KEY },
    // Tecla D (card 2): abre o painel Dividir embaixo das formas.
    split: { label: 'Dividir', letter: SPLIT_KEY },
  };

/**
 * A pagar ou Dividir com o número fixo da posição (2026-11-10, Cadastros → Pagamentos); a letra
 * de antes (0, D) segue valendo e aparece na dica.
 */
function SpecialKey(props: {
  kind: SpecialKeyKind;
  number: number;
  checked: boolean;
  onChoose(): void;
}) {
  const { label, letter } = SPECIAL_KEYS[props.kind];
  return (
    <label
      className="toggle-key toggle-key-sm"
      data-checked={props.checked}
      title={`Tecla ${props.number} ou ${letter}`}
    >
      <input
        type="radio"
        aria-label={label}
        name="payment-method"
        checked={props.checked}
        onChange={props.onChoose}
      />
      <kbd aria-hidden className="kbd-hint">
        {props.number}
      </kbd>
      {label}
    </label>
  );
}

function MethodKey(props: {
  method: PaymentMethod;
  number: number;
  checked: boolean;
  autoFocus: boolean;
  onChoose(): void;
}) {
  const { method } = props;
  return (
    <label className="toggle-key toggle-key-sm" data-checked={props.checked}>
      <input
        type="radio"
        aria-label={method.name}
        name="payment-method"
        checked={props.checked}
        onChange={props.onChoose}
        data-autofocus={props.autoFocus || undefined}
      />
      <kbd aria-hidden className="kbd-hint">
        {props.number}
      </kbd>
      {method.name}
    </label>
  );
}

/** A tecla especial só existe onde a tela sabe o que fazer com ela (o A pagar, só no balcão). */
function specialChooser(
  kind: SpecialKeyKind,
  props: PaymentKeysProps,
  chooseOpen: () => void,
): (() => void) | undefined {
  if (kind === 'split') return props.onSplitChosen;
  return props.onOpenChosen && chooseOpen;
}

/**
 * Forma de pagamento como teclas numeradas: com o foco aqui, o número escolhe e Enter salva.
 * Maquininha abre logo abaixo as teclas do meio (crédito, débito, PIX) e leva o foco para lá.
 * Desde 2026-11-10 o A pagar e o Dividir ficam no lugar de Cadastros → Pagamentos, com o número
 * fixo da posição (`payment-key-row.ts`); as letras 0 e D continuam valendo. Radio nativo por
 * baixo (teclado, leitor de tela e `getByLabelText`).
 */
export function PaymentKeys(props: PaymentKeysProps) {
  const { methods, value, onChange, groupRef } = props;
  const modeRef = useRef<HTMLFieldSetElement>(null);
  const layout = useAppSettings().paymentKeyLayout;
  const keys = numberedPaymentKeys(methods, layout);
  const selected = methods.find((m) => m.active && String(m.id) === value);
  const firstMethod = keys.find((key) => key.kind === 'method');
  const choose = (method: PaymentMethod) => {
    // As teclas do meio (e o Troco) só existem depois de renderizar: grava antes do foco.
    flushSync(() => onChange(String(method.id)));
    if (method.isCardTerminal) focusChoice(modeRef.current);
    if (method.isCash) props.onCashChosen?.();
    if (method.isFiado) props.onFiadoChosen?.();
  };
  const chooseOpen = () => {
    flushSync(() => onChange(OPEN_ACCOUNT));
    props.onOpenChosen?.();
  };
  const pick = (key: NumberedPaymentKey | undefined) => {
    if (!key) return;
    if (key.kind === 'method') return choose(key.method);
    specialChooser(key.kind, props, chooseOpen)?.();
  };
  const pickLetter = (kind: SpecialKeyKind) =>
    layout[kind].active ? specialChooser(kind, props, chooseOpen) : undefined;
  const handleKey = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    const letter = event.key === OPEN_KEY ? 'openAccount' : null;
    const kind =
      letter ?? (event.key.toUpperCase() === SPLIT_KEY ? 'split' : null);
    const special = kind && pickLetter(kind);
    if (special) {
      event.preventDefault();
      return special();
    }
    pressNumberKey(
      event,
      keys.length,
      (index) => pick(keys.find((key) => key.number === index + 1)),
      props.onSubmit,
    );
  };
  return (
    <>
      <fieldset className="payment-keys" ref={groupRef} onKeyDown={handleKey}>
        <legend>Pagamento</legend>
        {keys.map((key) => {
          if (key.kind === 'method')
            return (
              <MethodKey
                key={`m${key.method.id}`}
                method={key.method}
                number={key.number}
                checked={value === String(key.method.id)}
                autoFocus={props.autoFocus === true && key === firstMethod}
                onChoose={() => choose(key.method)}
              />
            );
          const onChoose = specialChooser(key.kind, props, chooseOpen);
          if (!onChoose) return null;
          return (
            <SpecialKey
              key={key.kind}
              kind={key.kind}
              number={key.number}
              checked={value === (key.kind === 'split' ? SPLIT : OPEN_ACCOUNT)}
              onChoose={onChoose}
            />
          );
        })}
      </fieldset>
      {selected?.isCardTerminal && (
        <PaymentModeKeys
          terminal={selected.name}
          value={props.mode}
          onChange={props.onModeChange}
          onSubmit={props.onSubmit}
          groupRef={modeRef}
        />
      )}
    </>
  );
}
