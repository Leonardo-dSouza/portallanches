import type { RefObject } from 'react';
import { TextField } from '../components/TextField';
import type { DeliveryZone } from '../api/types';
import type { OrderFormState } from './use-order-form';

interface OrderFormFieldsProps {
  form: OrderFormState;
  zones: DeliveryZone[];
  /** Telefone: primeiro campo da entrega (o F2 leva o foco para ele). */
  phoneRef: RefObject<HTMLInputElement | null>;
}

function TypeChoice({ form }: { form: OrderFormState }) {
  return (
    <fieldset className="choice">
      <legend>
        Tipo <kbd aria-hidden>F2</kbd>
      </legend>
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
  phoneRef,
}: Pick<OrderFormFieldsProps, 'form' | 'phoneRef'>) {
  const typedName = form.values.customerName.trim();
  return (
    <>
      <TextField
        label="Telefone"
        inputMode="tel"
        ref={phoneRef}
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
  phoneRef,
}: Pick<OrderFormFieldsProps, 'form' | 'zones' | 'phoneRef'>) {
  return (
    <>
      <CustomerFields form={form} phoneRef={phoneRef} />
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

/** Tipo do pedido e, na entrega, quem pediu e onde (antes dos itens, como na comanda). */
export function OrderFormFields({
  form,
  zones,
  phoneRef,
}: OrderFormFieldsProps) {
  const isDelivery = form.values.type === 'DELIVERY';
  return (
    <>
      <TypeChoice form={form} />
      {isDelivery && (
        <DeliveryFields form={form} zones={zones} phoneRef={phoneRef} />
      )}
      {isDelivery && <hr className="slip-divider" />}
    </>
  );
}
