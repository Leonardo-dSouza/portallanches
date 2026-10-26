import type { KeyboardEvent, RefObject } from 'react';
import type { DeliveryZone } from '../api/types';
import { TextField } from '../components/TextField';
import { CustomerChoices } from './CustomerChoices';
import type { OrderFormState } from './use-order-form';

interface CustomerNameFieldsProps {
  form: OrderFormState;
  zones: DeliveryZone[];
  phoneRef: RefObject<HTMLInputElement | null>;
  /** Enter no Nome do cliente (o fiado do balcão salva); sem ele, segue para o próximo campo. */
  onNameKeyDown?(event: KeyboardEvent<HTMLInputElement>): void;
}

function CustomerHint({
  form,
  zones,
}: Pick<CustomerNameFieldsProps, 'form' | 'zones'>) {
  const typedName = form.values.customerName.trim();
  if (form.customerChoices.length > 1)
    return (
      <CustomerChoices
        choices={form.customerChoices}
        zones={zones}
        onChoose={form.chooseCustomer}
      />
    );
  if (!typedName) return null;
  return (
    <p className="hint">
      {form.knownCustomer
        ? 'Cliente cadastrado: mudanças atualizam o cadastro.'
        : `Cliente novo: "${typedName}" será cadastrado ao salvar.`}
    </p>
  );
}

/**
 * Telefone e nome do cliente, com a busca ao sair de cada campo e a dica embaixo (cadastrado,
 * novo ou os homônimos). Servem à entrega e ao fiado do balcão (2026-10-25).
 *
 * @example <CustomerNameFields form={form} zones={zones} phoneRef={phoneRef} />
 */
export function CustomerNameFields({
  form,
  zones,
  phoneRef,
  onNameKeyDown,
}: CustomerNameFieldsProps) {
  return (
    <>
      <div className="field-pair phone-pair">
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
          onBlur={() => void form.lookupName()}
          onKeyDown={onNameKeyDown}
        />
      </div>
      <CustomerHint form={form} zones={zones} />
    </>
  );
}
