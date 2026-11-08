import type { PayOrderInput } from '../api/cash-api';
import { toApiMoney } from '../api/money';
import type { PaymentMethod, PaymentMode } from '../api/types';
import { missingPaymentMode } from './payment-choice';
import { receiveMethods } from './receive-fiado-values';

/** O Receber do A pagar como o caixa digita (card 8, 2026-11-08). */
export interface ReceiveOpenAccountValues {
  paymentMethodId: string;
  paymentMode: PaymentMode | '';
  /** "Troco para" em R$; vazio = sem troco. Só no dinheiro. */
  changeFor: string;
}

export const EMPTY_OPEN_ACCOUNT_PAYMENT: ReceiveOpenAccountValues = {
  paymentMethodId: '',
  paymentMode: '',
  changeFor: '',
};

export type OpenAccountPaymentResult =
  { ok: true; input: PayOrderInput } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false, error }) as const;

/**
 * A forma escolhida é dinheiro: só nela aparece o "Troco para".
 *
 * @example isCashChoice({ paymentMethodId: '1', … }, methods) // true
 */
export function isCashChoice(
  values: Pick<ReceiveOpenAccountValues, 'paymentMethodId'>,
  methods: PaymentMethod[],
): boolean {
  return methods.some(
    (m) => String(m.id) === values.paymentMethodId && m.isCash,
  );
}

/** O troco digitado no formato da API: '' sem troco, null se inválido. */
function typedChange(values: ReceiveOpenAccountValues, cash: boolean) {
  if (!cash || !values.changeFor.trim()) return '';
  return toApiMoney(values.changeFor);
}

/**
 * Valida o Receber e monta o corpo. O troco abaixo do total quem recusa é a API (422).
 *
 * @example buildOpenAccountPayment({ paymentMethodId: '1', paymentMode: '', changeFor: '50' }, methods)
 */
export function buildOpenAccountPayment(
  values: ReceiveOpenAccountValues,
  methods: PaymentMethod[],
): OpenAccountPaymentResult {
  if (!values.paymentMethodId)
    return fail(
      `Escolha a forma do pagamento (teclas 1 a ${receiveMethods(methods).length})`,
    );
  const modeMissing = missingPaymentMode(values, methods);
  if (modeMissing) return fail(modeMissing);
  const change = typedChange(values, isCashChoice(values, methods));
  if (change === null)
    return fail(
      `Troco inválido "${values.changeFor}": digite só números (ex.: 50,00) ou deixe vazio`,
    );
  const input: PayOrderInput = {
    paymentMethodId: Number(values.paymentMethodId),
    ...(values.paymentMode && { paymentMode: values.paymentMode }),
    ...(change && { changeFor: change }),
  };
  return { ok: true, input };
}
