import { KeyRound } from 'lucide-react';
import type { KeyboardEvent, RefObject } from 'react';
import { SwitchField } from '../components/SwitchField';
import { TextField } from '../components/TextField';
import type { DeliveryZone, OrderType } from '../api/types';
import { normalizeHouseNumber } from './address';
import { CustomerNameFields } from './CustomerNameFields';
import type { OrderFormState } from './use-order-form';
import { useCashShortcuts } from '../settings/app-settings-context';

interface OrderFormFieldsProps {
  form: OrderFormState;
  zones: DeliveryZone[];
  /** Nome do cliente: primeiro campo da entrega (o F2 leva o foco para ele). */
  customerNameRef: RefObject<HTMLInputElement | null>;
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

const TYPE_LABELS: Record<OrderType, string> = {
  COUNTER: 'Balcão',
  DELIVERY: 'Entrega',
  IFOOD: 'iFood',
};

/** Uma tecla do tipo; `quiet` é a do iFood, pequena e apagada (raro: 1 pedido a cada 4 noites). */
function TypeKey({
  form,
  type,
  quiet = false,
}: {
  form: OrderFormState;
  type: OrderType;
  quiet?: boolean;
}) {
  return (
    <label className={quiet ? 'type-key-quiet' : undefined}>
      <input
        type="radio"
        name="order-type"
        checked={form.values.type === type}
        onChange={() => form.setField('type', type)}
      />
      {TYPE_LABELS[type]}
    </label>
  );
}

/** Balcão e Entrega como teclas; o iFood (2026-11-23) fica no canto, quase escondido. */
function TypeChoice({ form }: { form: OrderFormState }) {
  const shortcut = useCashShortcuts().toggleType;
  return (
    <fieldset className="choice type-choice">
      <legend>
        Tipo{' '}
        <kbd aria-hidden className="kbd-hint">
          {shortcut}
        </kbd>
      </legend>
      <TypeKey form={form} type="COUNTER" />
      <TypeKey form={form} type="DELIVERY" />
      <TypeKey form={form} type="IFOOD" quiet />
    </fieldset>
  );
}

/**
 * Pedido do iFood (2026-11-23): faixa bem visível, para o caixa não lançar balcão como iFood sem
 * ver, e os dois campos da comanda. Sem pagamento: é sempre o do iFood, pago no app.
 */
function IfoodFields({ form }: { form: OrderFormState }) {
  return (
    <section className="ifood-panel" aria-label="Pedido iFood">
      <p className="ifood-panel-title">Pedido iFood</p>
      <p className="ifood-panel-hint">Pago no app, fora do caixa da noite.</p>
      <div className="field-pair">
        <TextField
          label="Cliente"
          autoComplete="off"
          placeholder="Opcional; sai na comanda"
          value={form.values.counterName}
          onChange={(value) => form.setField('counterName', value)}
        />
        <TextField
          label="Nº no iFood"
          autoComplete="off"
          inputMode="numeric"
          maxLength={10}
          placeholder="Opcional"
          value={form.values.ifoodCode}
          onChange={(value) => form.setField('ifoodCode', value)}
        />
      </div>
    </section>
  );
}

/** Escolha de consumo no balcão: VIAGEM ou COMER (2026-11-08). */
function DiningChoice({ form }: { form: OrderFormState }) {
  const shortcut = useCashShortcuts().toggleDining;
  return (
    <fieldset className="choice">
      <legend>
        Comer/Viagem{' '}
        <kbd aria-hidden className="kbd-hint">
          {shortcut}
        </kbd>
      </legend>
      {(['TAKEAWAY', 'EAT_IN'] as const).map((option) => (
        <label key={option}>
          <input
            type="radio"
            name="dining-option"
            checked={form.values.diningOption === option}
            onChange={() => form.setField('diningOption', option)}
          />
          {option === 'TAKEAWAY' ? 'VIAGEM' : 'COMER'}
        </label>
      ))}
    </fieldset>
  );
}

function CustomerFields({
  form,
  zones,
  customerNameRef,
}: Pick<OrderFormFieldsProps, 'form' | 'zones' | 'customerNameRef'>) {
  return (
    <>
      <CustomerNameFields
        form={form}
        zones={zones}
        customerNameRef={customerNameRef}
      />
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
  customerNameRef,
}: Pick<OrderFormFieldsProps, 'form' | 'zones' | 'customerNameRef'>) {
  return (
    <>
      <CustomerFields
        form={form}
        zones={zones}
        customerNameRef={customerNameRef}
      />
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
      <SwitchField
        label="Código de entrega"
        Icon={KeyRound}
        checked={form.values.deliveryCode}
        onChange={form.setDeliveryCode}
      />
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
  customerNameRef,
  nameRef,
}: OrderFormFieldsProps) {
  const isDelivery = form.values.type === 'DELIVERY';
  if (form.values.type === 'IFOOD')
    return (
      <>
        <TypeChoice form={form} />
        <IfoodFields form={form} />
      </>
    );
  return (
    <>
      <TypeChoice form={form} />
      {isDelivery && (
        <DeliveryFields
          form={form}
          zones={zones}
          customerNameRef={customerNameRef}
        />
      )}
      {/* No fiado do balcão o nome é o do cliente, no bloco do fiado (2026-10-25). */}
      {!isDelivery && !form.fiado && (
        <CounterNameField form={form} nameRef={nameRef} />
      )}
      {!isDelivery && <DiningChoice form={form} />}
      {isDelivery && <hr className="slip-divider" />}
    </>
  );
}
