import { useRef, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { moneyToCents } from '../api/money';
import type { Order, PaymentMethod } from '../api/types';
import { SPLIT } from './payment-choice';
import {
  buildOpenAccountPayment,
  EMPTY_OPEN_ACCOUNT_PAYMENT,
  type ReceiveOpenAccountValues,
} from './receive-open-account-values';
import {
  closeSplitChoice,
  collapseSplitChoice,
  openSplitChoice,
  type SplitPartDraft,
} from './split-payment';

export interface ReceiveOpenAccountState {
  values: ReceiveOpenAccountValues;
  setField(field: keyof ReceiveOpenAccountValues, value: string): void;
  setSplitParts(parts: SplitPartDraft[]): void;
  openSplit(): void;
  closeSplit(): void;
  /** Tirar uma de duas partes: volta para a forma única da que ficou (2026-11-10). */
  collapseSplit(kept: SplitPartDraft): void;
  error: string | null;
  busy: boolean;
  submit(): Promise<void>;
}

/**
 * O Receber do A pagar (card 8, 2026-11-08): a forma por escolher e o troco vazio. Trocar a forma
 * limpa o meio da maquininha, como na comanda; a trava em `ref` barra o Enter duplo antes de o
 * React redesenhar (o mesmo cuidado do pedido, card 9).
 *
 * @example const state = useReceiveOpenAccount(cash, order, day.paymentMethods, closeAndReload);
 */
export function useReceiveOpenAccount(
  cash: CashApi,
  order: Order,
  methods: PaymentMethod[],
  onReceived: (order: Order) => void,
): ReceiveOpenAccountState {
  const [values, setValues] = useState(EMPTY_OPEN_ACCOUNT_PAYMENT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const setField = (field: keyof ReceiveOpenAccountValues, value: string) =>
    setValues((current) =>
      field === 'paymentMethodId'
        ? {
            ...current,
            paymentMethodId: value,
            paymentMode: '',
            splitParts: value === SPLIT ? current.splitParts : [],
          }
        : { ...current, [field]: value },
    );
  const setSplitParts = (splitParts: SplitPartDraft[]) =>
    setValues((current) => ({ ...current, splitParts }));
  const openSplit = () => setValues(openSplitChoice);
  const closeSplit = () => setValues(closeSplitChoice);
  const collapseSplit = (kept: SplitPartDraft) =>
    setValues((current) => collapseSplitChoice(current, kept));
  const submit = async () => {
    const built = buildOpenAccountPayment(
      values,
      methods,
      moneyToCents(order.amount),
    );
    if (!built.ok) return setError(built.error);
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      onReceived(await cash.payOrder(order.id, built.input));
    } catch (failure) {
      setError(errorMessage(failure));
    }
    sending.current = false;
    setBusy(false);
  };
  return {
    values,
    setField,
    setSplitParts,
    openSplit,
    closeSplit,
    collapseSplit,
    error,
    busy,
    submit,
  };
}
