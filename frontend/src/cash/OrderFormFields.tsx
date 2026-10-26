import type { KeyboardEvent, RefObject } from 'react';
import { TextField } from '../components/TextField';
import type { DeliveryZone } from '../api/types';
import { normalizeHouseNumber } from './address';
import { CustomerNameFields } from './CustomerNameFields';
import type { OrderFormState } from './use-order-form';
import { useCashShortcuts } from '../settings/app-settings-context';

interface OrderFormFieldsProps {
  form: OrderFormState;
  zones: DeliveryZone[];
  /** Telefone: primeiro campo da entrega (o F2 leva o foco para ele). */
  phoneRef: RefObject<HTMLInputElement | null>;
  /** Nome do balcão: a tecla 0 (conta aberta) leva o foco para ele. */
  nameRef: RefObject<HTMLInputElement | null>;
}

/**
 * Enter no Nome do balcão: com a forma já escolhida (ou a conta aberta), salva; sem ela,
 * segue para o próximo campo como nos outros.
 */
function submitIfPaid(
  event: KeyboardEvent<HTMLInputElement>,
  form: OrderFormState,
): void {
  if (event.key !== 'Enter' || event.ctrlKey || !form.values.paymentMethodId)
    return;
  event.preventDefault();
  void form.submit();
}

/** Nome no balcão (2026-10-10): opcional no pedido pago, obrigatório na conta aberta. */
function CounterNameField({
  form,
  nameRef,
}: Pick<OrderFormFieldsProps, 'form' | 'nameRef'>) {
  return (
    <TextField
      label="Nome"
      ref={nameRef}
      autoComplete="off"
      placeholder="Opcional; obrigatório no A pagar (tecla 0)"
      value={form.values.counterName}
      onChange={(value) => form.setField('counterName', value)}
      onKeyDown={(event) => submitIfPaid(event, form)}
    />
  );
}

function TypeChoice({ form }: { form: OrderFormState }) {
  const shortcut = useCashShortcuts().toggleType;
  return (
    <fieldset className="choice">
      <legend>
        Tipo <kbd aria-hidden>{shortcut}</kbd>
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
  zones,
  phoneRef,
}: Pick<OrderFormFieldsProps, 'form' | 'zones' | 'phoneRef'>) {
  return (
    <>
      <CustomerNameFields form={form} zones={zones} phoneRef={phoneRef} />
      <div className="field-pair street-pair">
        <TextField
          label="Rua"
          list="street-suggestions"
          value={form.values.street}
          onChange={(value) => form.setField('street', value)}
          onBlur={form.snapStreet}
        />
        <TextField
          label="Número"
          value={form.values.houseNumber}
          onChange={(value) => form.setField('houseNumber', value)}
          onBlur={() =>
            form.setField(
              'houseNumber',
              normalizeHouseNumber(form.values.houseNumber),
            )
          }
        />
      </div>
      <datalist id="street-suggestions">
        {form.streets.map((street) => (
          <option key={street} value={street} />
        ))}
      </datalist>
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
      <CustomerFields form={form} zones={zones} phoneRef={phoneRef} />
      <div className="field-trio place-trio">
        <TextField
          label="Referência"
          value={form.values.reference}
          onChange={(value) => form.setField('reference', value)}
        />
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
          label="Taxa"
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

/**
 * Tipo do pedido e quem pediu (antes dos itens, como na comanda): na entrega, o cliente e
 * onde; no balcão, o nome (no fiado, o cliente fica no bloco do fiado, abaixo do pagamento).
 */
export function OrderFormFields({
  form,
  zones,
  phoneRef,
  nameRef,
}: OrderFormFieldsProps) {
  const isDelivery = form.values.type === 'DELIVERY';
  return (
    <>
      <TypeChoice form={form} />
      {isDelivery && (
        <DeliveryFields form={form} zones={zones} phoneRef={phoneRef} />
      )}
      {/* No fiado do balcão o nome é o do cliente, no bloco do fiado (2026-10-25). */}
      {!isDelivery && !form.fiado && (
        <CounterNameField form={form} nameRef={nameRef} />
      )}
      {isDelivery && <hr className="slip-divider" />}
    </>
  );
}
