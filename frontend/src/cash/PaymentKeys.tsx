import type { KeyboardEvent, RefObject } from 'react';
import type { PaymentMethod } from '../api/types';

interface PaymentKeysProps {
  methods: PaymentMethod[];
  value: string;
  onChange(value: string): void;
  /** Enter no pagamento salva o pedido. */
  onSubmit(): void;
  groupRef: RefObject<HTMLFieldSetElement | null>;
}

/**
 * Forma de pagamento como teclas numeradas: com o foco aqui, 1 a 4 escolhem e Enter salva.
 * Radio nativo por baixo (teclado, leitor de tela e `getByLabelText`).
 */
export function PaymentKeys(props: PaymentKeysProps) {
  const { methods, value, onChange, groupRef } = props;
  const active = methods.filter((m) => m.active);
  const handleKey = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    const index = Number(event.key) - 1;
    if (index >= 0 && index < active.length) {
      event.preventDefault();
      onChange(String(active[index].id));
    } else if (event.key === 'Enter' && !event.ctrlKey) {
      event.preventDefault();
      props.onSubmit();
    }
  };
  return (
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
            onChange={() => onChange(String(method.id))}
          />
          <kbd aria-hidden>{index + 1}</kbd>
          {method.name}
        </label>
      ))}
    </fieldset>
  );
}
