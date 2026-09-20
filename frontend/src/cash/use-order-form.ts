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
import { saveOrderRequest } from './save-order';

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
  setField<K extends keyof OrderFormValues>(field: K, value: string): void;
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

  const setField = (field: keyof OrderFormValues, value: string) =>
    setValues((current) =>
      field === 'neighborhood'
        ? withNeighborhood(current, value, zones)
        : { ...current, [field]: value },
    );

  const submit = async () => {
    const built = buildOrderRequest(values, zones);
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
    setField,
    submit,
  };
}
