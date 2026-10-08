import type { KeyboardEvent, RefObject } from 'react';
import type { PaymentMode } from '../api/types';
import { pressNumberKey } from './choice-keys';
import { PAYMENT_MODES } from './payment-choice';

interface PaymentModeKeysProps {
  /** Nome da maquininha escolhida ("Maquininha Ton"). */
  terminal: string;
  value: PaymentMode | '';
  onChange(mode: PaymentMode): void;
  onSubmit(): void;
  groupRef: RefObject<HTMLFieldSetElement | null>;
}

/** Meio usado na maquininha: 1 Crédito, 2 Débito, 3 PIX; Enter salva (como nas formas). */
export function PaymentModeKeys(props: PaymentModeKeysProps) {
  const { terminal, value, onChange, groupRef } = props;
  const handleKey = (event: KeyboardEvent<HTMLFieldSetElement>) =>
    pressNumberKey(
      event,
      PAYMENT_MODES.length,
      (index) => onChange(PAYMENT_MODES[index].mode),
      props.onSubmit,
    );
  return (
    <fieldset
      className="payment-keys payment-mode-keys"
      ref={groupRef}
      onKeyDown={handleKey}
    >
      <legend>Meio na {terminal}</legend>
      {PAYMENT_MODES.map(({ mode, label }, index) => (
        <label
          key={mode}
          className="toggle-key toggle-key-sm"
          data-checked={value === mode}
        >
          <input
            type="radio"
            aria-label={label}
            name="payment-mode"
            checked={value === mode}
            onChange={() => onChange(mode)}
          />
          <kbd aria-hidden>{index + 1}</kbd>
          {label}
        </label>
      ))}
    </fieldset>
  );
}
