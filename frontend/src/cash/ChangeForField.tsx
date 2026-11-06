import type { RefObject } from 'react';
import type { PaymentMethod } from '../api/types';
import { TextField } from '../components/TextField';
import { submitOnEnter } from './submit-on-enter';
import type { OrderFormState } from './use-order-form';

interface ChangeForFieldProps {
  form: OrderFormState;
  methods: PaymentMethod[];
  changeRef: RefObject<HTMLInputElement | null>;
}

/** "Troco para" (2026-10-10): só na entrega paga na forma marcada como dinheiro. */
export function ChangeForField({
  form,
  methods,
  changeRef,
}: ChangeForFieldProps) {
  const method = methods.find(
    (m) => String(m.id) === form.values.paymentMethodId,
  );
  if (form.values.type !== 'DELIVERY' || !method?.isCash) return null;
  return (
    <TextField
      label="Troco para"
      inputMode="decimal"
      ref={changeRef}
      placeholder="Vazio = sem troco"
      value={form.values.changeFor}
      onChange={(value) => form.setField('changeFor', value)}
      onKeyDown={(event) => submitOnEnter(event, form)}
    />
  );
}
