import type { PaymentMethod } from '../api/types';
import { prepaidAllowed } from './prepaid';
import type { OrderFormState } from './use-order-form';

interface PrepaidKeyProps {
  form: OrderFormState;
  methods: PaymentMethod[];
}

/**
 * Tecla de alternar PAGO ao lado das teclas de pagamento na entrega.
 *
 * @example <PrepaidKey form={form} methods={methods} />
 */
export function PrepaidKey({ form, methods }: PrepaidKeyProps) {
  if (!prepaidAllowed(form.values, methods)) return null;
  const isPressed = form.values.prepaid;
  return (
    <button
      type="button"
      className="toggle-key toggle-key-brand prepaid-key"
      aria-pressed={isPressed}
      onClick={() => form.setPrepaid(!isPressed)}
    >
      PAGO
    </button>
  );
}
