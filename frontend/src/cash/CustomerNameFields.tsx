import type { KeyboardEvent, RefObject } from 'react';
import type { DeliveryZone } from '../api/types';
import { TextField } from '../components/TextField';
import { CustomerChoices } from './CustomerChoices';
import type { OrderFormState } from './use-order-form';

interface CustomerNameFieldsProps {
  form: OrderFormState;
  zones: DeliveryZone[];
  customerNameRef: RefObject<HTMLInputElement | null>;
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
 * Nome do cliente, com a busca ao sair do campo e a dica embaixo (cadastrado, novo ou os
 * homônimos). Serve à entrega e ao fiado do balcão (2026-10-25). O Telefone saiu em 2026-11-21:
 * quase não era usado; o cadastro guarda o que já tinha.
 *
 * @example <CustomerNameFields form={form} zones={zones} customerNameRef={customerNameRef} />
 */
export function CustomerNameFields({
  form,
  zones,
  customerNameRef,
  onNameKeyDown,
}: CustomerNameFieldsProps) {
  return (
    <>
      <TextField
        label="Nome do cliente"
        ref={customerNameRef}
        value={form.values.customerName}
        onChange={(value) => form.setField('customerName', value)}
        onBlur={() => void form.lookupName()}
        onKeyDown={onNameKeyDown}
      />
      <CustomerHint form={form} zones={zones} />
    </>
  );
}
