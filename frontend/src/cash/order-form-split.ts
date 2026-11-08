import { moneyToCents } from '../api/money';
import type { Order, PaymentMethod, PaymentMode } from '../api/types';
import type { OrderFormValues } from './order-form-values';
import { isFiadoChoice, missingPaymentMode } from './payment-choice';
import { addOnParts, isSplitOrder, toSplitPartDrafts } from './split-payment';

// + Item em pedido dividido (card 2, decisão do usuário de 2026-11-08): o acréscimo pergunta a
// forma em que foi pago (Enter = a da última parte). Pedido de uma forma segue como antes: o
// acréscimo vai para a mesma forma, sem pergunta.

/** A forma escolhida para pagar o acréscimo. */
export interface AddOnChoice {
  methodId: string;
  mode: PaymentMode | '';
}

/**
 * Forma inicial do acréscimo: a da última parte do pedido dividido (o Enter aceita).
 *
 * @example initialAddOnChoice(pix10MaisDinheiro25) // { methodId: '2', mode: '' }
 */
export function initialAddOnChoice(adding: Order | null): AddOnChoice {
  const last =
    adding && isSplitOrder(adding) ? adding.paymentParts.at(-1) : null;
  return {
    methodId: last ? String(last.paymentMethodId) : '',
    mode: last?.paymentMode ?? '',
  };
}

/**
 * O acréscimo do + Item em centavos: o total novo menos o salvo (0 fora do + Item).
 *
 * @example addedCents(contaDe3520, 4280) // 760
 */
export function addedCents(adding: Order | null, totalCents: number): number {
  if (!adding) return 0;
  return Math.max(0, totalCents - moneyToCents(adding.amount));
}

/** Só o pedido dividido com acréscimo pergunta a forma. */
export const asksAddOnPayment = (
  adding: Order | null,
  cents: number,
): boolean => adding !== null && isSplitOrder(adding) && cents > 0;

/**
 * A forma do acréscimo está completa? Null quando sim (ou quando não se pergunta).
 *
 * @example addOnProblem(dividido, 760, { methodId: '', mode: '' }, methods) // 'Escolha a forma…'
 */
export function addOnProblem(
  adding: Order | null,
  cents: number,
  choice: AddOnChoice,
  methods: PaymentMethod[],
): string | null {
  if (!asksAddOnPayment(adding, cents)) return null;
  if (!choice.methodId) return 'Escolha a forma em que o acréscimo foi pago';
  if (isFiadoChoice(choice.methodId, methods))
    return 'Fiado não divide: escolha outra forma para o acréscimo';
  return missingPaymentMode(
    { paymentMethodId: choice.methodId, paymentMode: choice.mode },
    methods,
  );
}

/**
 * As partes do pedido com o acréscimo somado (na parte de mesma forma e meio, ou numa nova).
 *
 * @example withAddOnParts(values, dividido, 760, { methodId: '1', mode: '' }).splitParts.length // 2
 */
export function withAddOnParts(
  values: OrderFormValues,
  adding: Order | null,
  cents: number,
  choice: AddOnChoice,
): OrderFormValues {
  if (!adding || !asksAddOnPayment(adding, cents)) return values;
  const parts = addOnParts(
    adding.paymentParts,
    Number(choice.methodId),
    choice.mode || null,
    cents,
  );
  return { ...values, splitParts: toSplitPartDrafts(parts) };
}
