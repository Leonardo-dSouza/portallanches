import { useRef, type KeyboardEvent, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { PaymentMethod, PaymentMode } from '../api/types';
import { focusChoice, pressNumberKey } from './choice-keys';
import { OPEN_ACCOUNT } from './payment-choice';
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
  groupRef: RefObject<HTMLFieldSetElement | null>;
  /** Só no balcão: a tecla 0 deixa a conta aberta e chama isto (o foco vai ao Nome). */
  onOpenChosen?(): void;
  /** Escolheu a forma "Dinheiro" (na entrega, o foco vai ao "Troco para"). */
  onCashChosen?(): void;
}

const OPEN_KEY = '0';

/** Tecla 0 do balcão: a conta fica aberta no nome e é paga no fim (2026-10-10). */
function OpenAccountKey({
  checked,
  onChoose,
}: {
  checked: boolean;
  onChoose(): void;
}) {
  return (
    <label className="toggle-key toggle-key-sm" data-checked={checked}>
      <input
        type="radio"
        aria-label="Aberto"
        name="payment-method"
        checked={checked}
        onChange={onChoose}
      />
      <kbd aria-hidden>{OPEN_KEY}</kbd>
      Aberto
    </label>
  );
}

/**
 * Forma de pagamento como teclas numeradas: com o foco aqui, 1 a 4 escolhem e Enter salva.
 * Maquininha abre logo abaixo as teclas do meio (crédito, débito, PIX) e leva o foco para lá.
 * Radio nativo por baixo (teclado, leitor de tela e `getByLabelText`).
 */
export function PaymentKeys(props: PaymentKeysProps) {
  const { methods, value, onChange, groupRef } = props;
  const modeRef = useRef<HTMLFieldSetElement>(null);
  const active = methods.filter((m) => m.active);
  const selected = active.find((m) => String(m.id) === value);
  const choose = (method: PaymentMethod) => {
    // As teclas do meio (e o Troco) só existem depois de renderizar: grava antes do foco.
    flushSync(() => onChange(String(method.id)));
    if (method.isCardTerminal) focusChoice(modeRef.current);
    if (method.isCash) props.onCashChosen?.();
  };
  const chooseOpen = () => {
    flushSync(() => onChange(OPEN_ACCOUNT));
    props.onOpenChosen?.();
  };
  const handleKey = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    if (event.key === OPEN_KEY && props.onOpenChosen) {
      event.preventDefault();
      return chooseOpen();
    }
    pressNumberKey(
      event,
      active.length,
      (index) => choose(active[index]),
      props.onSubmit,
    );
  };
  return (
    <>
      <fieldset className="payment-keys" ref={groupRef} onKeyDown={handleKey}>
        <legend>Pagamento</legend>
        {active.map((method, index) => (
          <label
            key={method.id}
            className="toggle-key toggle-key-sm"
            data-checked={value === String(method.id)}
          >
            <input
              type="radio"
              aria-label={method.name}
              name="payment-method"
              checked={value === String(method.id)}
              onChange={() => choose(method)}
            />
            <kbd aria-hidden>{index + 1}</kbd>
            {method.name}
          </label>
        ))}
        {props.onOpenChosen && (
          <OpenAccountKey
            checked={value === OPEN_ACCOUNT}
            onChoose={chooseOpen}
          />
        )}
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
