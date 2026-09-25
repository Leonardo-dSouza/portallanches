import type { RefObject } from 'react';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import type { DeliveryZone, PaymentMethod } from '../api/types';
import type { OrderFormState } from './use-order-form';

interface OrderFormFieldsProps {
  form: OrderFormState;
  paymentMethods: PaymentMethod[];
  zones: DeliveryZone[];
  /** Primeiro campo a preencher (Telefone na entrega, Valor no balcão): recebe o foco após salvar. */
  firstFieldRef: RefObject<HTMLInputElement | null>;
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

function CustomerFields({
  form,
  firstFieldRef,
}: Pick<OrderFormFieldsProps, 'form' | 'firstFieldRef'>) {
  const typedName = form.values.customerName.trim();
  return (
    <>
      <TextField
        label="Telefone"
        inputMode="tel"
        ref={firstFieldRef}
        value={form.values.phone}
        onChange={(value) => form.setField('phone', value)}
        onBlur={() => void form.lookupPhone()}
      />
      <TextField
        label="Nome do cliente"
        value={form.values.customerName}
        onChange={(value) => form.setField('customerName', value)}
      />
      <TextField
        label="Rua"
        list="street-suggestions"
        value={form.values.street}
        onChange={(value) => form.setField('street', value)}
        onBlur={form.snapStreet}
      />
      <datalist id="street-suggestions">
        {form.streets.map((street) => (
          <option key={street} value={street} />
        ))}
      </datalist>
      {typedName && (
        <p className="hint">
          {form.knownCustomer
            ? 'Cliente cadastrado: mudanças atualizam o cadastro.'
            : `Cliente novo: "${typedName}" será cadastrado.`}
        </p>
      )}
    </>
  );
}

function DeliveryFields({
  form,
  zones,
  firstFieldRef,
}: Pick<OrderFormFieldsProps, 'form' | 'zones' | 'firstFieldRef'>) {
  return (
    <>
      <CustomerFields form={form} firstFieldRef={firstFieldRef} />
      <div className="field-pair">
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
      </div>
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
  firstFieldRef,
}: OrderFormFieldsProps) {
  const isDelivery = form.values.type === 'DELIVERY';
  // Na entrega o caixa lê primeiro quem pediu e onde; valor e pagamento vêm depois.
  return (
    <>
      <TypeChoice form={form} />
      {isDelivery && (
        <DeliveryFields
          form={form}
          zones={zones}
          firstFieldRef={firstFieldRef}
        />
      )}
      {isDelivery && <hr className="slip-divider" />}
      <TextField
        label="Valor"
        inputMode="decimal"
        ref={isDelivery ? undefined : firstFieldRef}
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
    </>
  );
}
