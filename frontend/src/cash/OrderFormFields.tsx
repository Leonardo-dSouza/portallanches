import type { RefObject } from 'react';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import type { DeliveryZone, PaymentMethod } from '../api/types';
import type { OrderFormState } from './use-order-form';

interface OrderFormFieldsProps {
  form: OrderFormState;
  paymentMethods: PaymentMethod[];
  zones: DeliveryZone[];
  amountRef: RefObject<HTMLInputElement | null>;
}

function TypeChoice({ form }: { form: OrderFormState }) {
  return (
    <fieldset className="choice">
      <legend>Tipo</legend>
      {(['COUNTER', 'DELIVERY'] as const).map((type) => (
        <label key={type}>
          <input
            type="radio"
            name="order-type"
            checked={form.values.type === type}
            onChange={() => form.setField('type', type)}
          />
          {type === 'COUNTER' ? 'Balcão' : 'Entrega'}
        </label>
      ))}
    </fieldset>
  );
}

function DeliveryFields({
  form,
  zones,
}: Pick<OrderFormFieldsProps, 'form' | 'zones'>) {
  return (
    <>
      <TextField
        label="Bairro"
        list="delivery-zones"
        value={form.values.neighborhood}
        onChange={(value) => form.setField('neighborhood', value)}
      />
      <datalist id="delivery-zones">
        {zones
          .filter((z) => z.active)
          .map((zone) => (
            <option key={zone.id} value={zone.neighborhood} />
          ))}
      </datalist>
      <TextField
        label="Taxa de entrega"
        inputMode="decimal"
        value={form.values.fee}
        onChange={(value) => form.setField('fee', value)}
      />
      {form.newZoneName && (
        <p className="hint">
          Bairro novo: "{form.newZoneName}" será cadastrado com esta taxa.
        </p>
      )}
    </>
  );
}

export function OrderFormFields({
  form,
  paymentMethods,
  zones,
  amountRef,
}: OrderFormFieldsProps) {
  return (
    <>
      <TypeChoice form={form} />
      <TextField
        label="Valor"
        inputMode="decimal"
        ref={amountRef}
        value={form.values.amount}
        onChange={(value) => form.setField('amount', value)}
      />
      <SelectField
        label="Forma de pagamento"
        value={form.values.paymentMethodId}
        options={paymentMethods
          .filter((m) => m.active)
          .map((m) => ({ value: String(m.id), label: m.name }))}
        onChange={(value) => form.setField('paymentMethodId', value)}
      />
      {form.values.type === 'DELIVERY' && (
        <DeliveryFields form={form} zones={zones} />
      )}
    </>
  );
}
