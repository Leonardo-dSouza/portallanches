import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Order, PaymentMode } from '../api/types';
import {
  addedCents,
  asksAddOnPayment,
  initialAddOnChoice,
  type AddOnChoice,
} from './order-form-split';
import type { OrderFormValues } from './order-form-values';
import {
  closeSplitChoice,
  collapseSplitChoice,
  openSplitChoice,
  type SplitPartDraft,
} from './split-payment';

/** O Dividir na comanda (card 2): abrir, fechar, as partes e a forma do acréscimo do + Item. */
export interface SplitFormState {
  open(): void;
  close(): void;
  /** Tirar uma de duas partes: volta para a forma única da que ficou (2026-11-10). */
  collapseTo(kept: SplitPartDraft): void;
  setParts(parts: SplitPartDraft[]): void;
  /** O total da comanda agora (itens + taxa), que as partes têm de somar. */
  totalCents: number;
  /** O acréscimo do + Item em centavos; 0 fora do + Item. */
  addedCents: number;
  /** Pedido dividido com acréscimo: a tela pergunta a forma dele. */
  asksAddOn: boolean;
  addOn: AddOnChoice;
  setAddOnMethod(methodId: string): void;
  setAddOnMode(mode: PaymentMode): void;
  resetAddOn(): void;
}

/**
 * O estado do Dividir da comanda, à parte do `useOrderForm` (que já é grande).
 *
 * @example const split = useSplitPayment(setValues, adding, totalCents); split.open();
 */
export function useSplitPayment(
  setValues: Dispatch<SetStateAction<OrderFormValues>>,
  adding: Order | null,
  totalCents: number,
): SplitFormState {
  const [addOn, setAddOn] = useState(() => initialAddOnChoice(adding));
  const cents = addedCents(adding, totalCents);
  return {
    open: () => setValues(openSplitChoice),
    close: () => setValues(closeSplitChoice),
    collapseTo: (kept) =>
      setValues((current) => collapseSplitChoice(current, kept)),
    setParts: (splitParts) =>
      setValues((current) => ({ ...current, splitParts })),
    totalCents,
    addedCents: cents,
    asksAddOn: asksAddOnPayment(adding, cents),
    addOn,
    setAddOnMethod: (methodId) => setAddOn({ methodId, mode: '' }),
    setAddOnMode: (mode) => setAddOn((current) => ({ ...current, mode })),
    resetAddOn: () => setAddOn(initialAddOnChoice(adding)),
  };
}
