import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { FiadoReceipt } from '../api/fiado-types';
import type { PaymentMethod } from '../api/types';
import type { FiadoTarget } from './fiado-labels';
import { typedMoney } from './order-form-values';
import {
  buildFiadoPayment,
  type ReceiveFiadoValues,
} from './receive-fiado-values';

export interface ReceiveFiadoState {
  values: ReceiveFiadoValues;
  setField(field: keyof ReceiveFiadoValues, value: string): void;
  error: string | null;
  busy: boolean;
  submit(): Promise<void>;
}

/**
 * O Receber (2026-10-25): o Valor começa com o que falta, o Adicional vazio e a forma por
 * escolher. Trocar a forma limpa o meio da maquininha, como na comanda.
 *
 * @example const state = useReceiveFiado(cash, target, day.paymentMethods, closeAndReload);
 */
export function useReceiveFiado(
  cash: CashApi,
  target: FiadoTarget,
  methods: PaymentMethod[],
  onReceived: (receipt: FiadoReceipt) => void,
): ReceiveFiadoState {
  const [values, setValues] = useState<ReceiveFiadoValues>(() => ({
    amount: typedMoney(target.remaining),
    extra: '',
    paymentMethodId: '',
    paymentMode: '',
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setField = (field: keyof ReceiveFiadoValues, value: string) =>
    setValues((current) =>
      field === 'paymentMethodId'
        ? { ...current, paymentMethodId: value, paymentMode: '' }
        : { ...current, [field]: value },
    );
  const submit = async () => {
    const built = buildFiadoPayment(values, methods);
    if (!built.ok) return setError(built.error);
    setBusy(true);
    try {
      onReceived(await cash.receiveFiado(target.orderId, built.input));
    } catch (failure) {
      setError(errorMessage(failure));
    }
    setBusy(false);
  };
  return { values, setField, error, busy, submit };
}
