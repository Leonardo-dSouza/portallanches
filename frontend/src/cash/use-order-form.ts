import { useState, type RefObject } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { DeliveryZone, Order } from '../api/types';
import {
  buildOrderRequest,
  EMPTY_ORDER_FORM,
  findZone,
  formValuesOf,
  typedMoney,
  type OrderFormValues,
} from './order-form-values';
import { customerOfOrder } from './customer-draft';
import { saveOrderRequest } from './save-order';
import { snapStreet } from './street-key';
import { useCustomerLookup } from './use-customer-lookup';
import { useStreetSuggestions } from './use-street-suggestions';

interface UseOrderFormArgs {
  cash: CashApi;
  zones: DeliveryZone[];
  editing: Order | null;
  onSaved(): void;
  /** Campo que recebe o foco depois de salvar (lançamento em sequência). */
  focusRef: RefObject<HTMLInputElement | null>;
}

export interface OrderFormState {
  values: OrderFormValues;
  error: string | null;
  saving: boolean;
  newZoneName: string | null;
  /** Entrega com cliente já cadastrado (true) ou a cadastrar ao salvar (false). */
  knownCustomer: boolean;
  /** Ruas já cadastradas no bairro digitado (ou em todos, sem bairro). */
  streets: string[];
  /** Ao sair do campo Rua: adota a grafia de uma rua já cadastrada, se for a mesma. */
  snapStreet(): void;
  setField<K extends keyof OrderFormValues>(field: K, value: string): void;
  lookupPhone(): Promise<void>;
  submit(): Promise<void>;
}

/** Ao mudar o bairro, a taxa vira a padrão dele (ou vazia se o bairro é novo). */
function withNeighborhood(
  values: OrderFormValues,
  neighborhood: string,
  zones: DeliveryZone[],
): OrderFormValues {
  const zone = findZone(zones, neighborhood);
  return { ...values, neighborhood, fee: zone ? typedMoney(zone.fee) : '' };
}

export function useOrderForm(args: UseOrderFormArgs): OrderFormState {
  const { cash, zones, editing, onSaved, focusRef } = args;
  const [values, setValues] = useState(() =>
    editing ? formValuesOf(editing, zones) : EMPTY_ORDER_FORM,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const customer = useCustomerLookup(
    cash,
    zones,
    setValues,
    editing && customerOfOrder(editing),
  );

  const setField = (field: keyof OrderFormValues, value: string) => {
    // Outro telefone = outro cliente: a próxima busca decide qual.
    if (field === 'phone') customer.setKnown(null);
    setValues((current) =>
      field === 'neighborhood'
        ? withNeighborhood(current, value, zones)
        : { ...current, [field]: value },
    );
  };

  const streets = useStreetSuggestions(
    cash,
    findZone(zones, values.neighborhood)?.id ?? null,
    values.type === 'DELIVERY',
  );
  const snapTypedStreet = () =>
    setValues((current) => ({
      ...current,
      street: snapStreet(current.street, streets),
    }));

  const lookupPhone = async () => {
    try {
      await customer.lookup(values);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const submit = async () => {
    const built = buildOrderRequest(values, zones, customer.known);
    if (!built.ok) return setError(built.error);
    setSaving(true);
    try {
      await saveOrderRequest(cash, editing?.id ?? null, built.request);
      // Lançamento em sequência: mantém tipo e pagamento, limpa o resto e volta ao valor.
      setValues({
        ...EMPTY_ORDER_FORM,
        type: values.type,
        paymentMethodId: values.paymentMethodId,
      });
      customer.setKnown(null);
      setError(null);
      onSaved();
      focusRef.current?.focus();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  const typedZone = values.neighborhood.trim();
  const isNew =
    values.type === 'DELIVERY' && typedZone && !findZone(zones, typedZone);
  return {
    values,
    error,
    saving,
    newZoneName: isNew ? typedZone : null,
    knownCustomer: customer.known !== null,
    streets,
    snapStreet: snapTypedStreet,
    setField,
    lookupPhone,
    submit,
  };
}
