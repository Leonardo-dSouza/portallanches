import type { PaymentMethod } from '../api/types';
import { prepaidAllowed } from './prepaid';
import type { OrderFormState } from './use-order-form';

interface PrepaidKeyProps {
  form: OrderFormState;
  methods: PaymentMethod[];
}

/**
 * Tecla de alternar "Pago" na linha das teclas de pagamento, na entrega (do tamanho delas).
 *
 * @example <PrepaidKey form={form} methods={methods} />
 */
export function PrepaidKey({ form, methods }: PrepaidKeyProps) {
  if (!prepaidAllowed(form.values, methods)) return null;
  const isPressed = form.values.prepaid;
  return (
    <button
      type="button"
      className="toggle-key toggle-key-sm toggle-key-brand prepaid-key"
      aria-pressed={isPressed}
      onClick={() => form.setPrepaid(!isPressed)}
      // Fica dentro da fileira das formas: o teclado delas (números, Enter salva) não vale aqui.
      onKeyDown={(event) => event.stopPropagation()}
    >
      Pago
    </button>
  );
}
