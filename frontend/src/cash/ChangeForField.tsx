import type { ReactNode, RefObject } from 'react';
import type { PaymentMethod } from '../api/types';
import { TextField } from '../components/TextField';
import { counterChangeOf } from './counter-change';
import { submitOnEnter } from './submit-on-enter';
import type { OrderFormState } from './use-order-form';

interface ChangeForFieldProps {
  form: OrderFormState;
  methods: PaymentMethod[];
  changeRef: RefObject<HTMLInputElement | null>;
}

/**
 * Campo do dinheiro: "Troco para" na entrega (2026-10-10, vai para a API e para a comanda) e
 * "Recebido" no balcão (2026-11-22), que só mostra o troco na tela: o balcão não grava troco.
 */
export function ChangeForField({
  form,
  methods,
  changeRef,
}: ChangeForFieldProps) {
  const method = methods.find(
    (m) => String(m.id) === form.values.paymentMethodId,
  );
  if (!method?.isCash) return null;
  const isCounter = form.values.type === 'COUNTER';
  const field = (
    <TextField
      label={isCounter ? 'Recebido' : 'Troco para'}
      inputMode="decimal"
      ref={changeRef}
      placeholder="Vazio = sem troco"
      value={form.values.changeFor}
      onChange={(value) => form.setField('changeFor', value)}
      onKeyDown={(event) => submitOnEnter(event, form)}
    />
  );
  if (!isCounter) return field;
  return <CounterChange field={field} form={form} />;
}

/** O "Recebido" do balcão com o troco (ou o que falta) ao lado, em letra grande. */
function CounterChange({
  field,
  form,
}: {
  field: ReactNode;
  form: OrderFormState;
}) {
  const change = counterChangeOf(form.values.changeFor, form.split.totalCents);
  return (
    <div className="counter-change">
      {field}
      {change && (
        <p
          className="counter-change-value"
          role="status"
          aria-label="Troco"
          data-short={change.short || undefined}
        >
          {change.text}
        </p>
      )}
    </div>
  );
}
