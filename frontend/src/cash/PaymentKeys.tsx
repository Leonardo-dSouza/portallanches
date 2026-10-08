import { useRef, type KeyboardEvent, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { PaymentMethod, PaymentMode } from '../api/types';
import { focusChoice, pressNumberKey } from './choice-keys';
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
    // As teclas do meio só existem depois de renderizar: grava a escolha antes do foco.
    flushSync(() => onChange(String(method.id)));
    if (method.isCardTerminal) focusChoice(modeRef.current);
  };
  const handleKey = (event: KeyboardEvent<HTMLFieldSetElement>) =>
    pressNumberKey(
      event,
      active.length,
      (index) => choose(active[index]),
      props.onSubmit,
    );
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
