import type { FiadoPaymentInput } from '../api/fiado-types';
import { moneyToCents, toApiMoney } from '../api/money';
import type { PaymentMethod, PaymentMode } from '../api/types';
import { missingPaymentMode } from './payment-choice';

/** O Receber como o caixa digita (tudo texto, como a comanda). */
export interface ReceiveFiadoValues {
  /** Quanto abate do pedido; começa com o que falta. */
  amount: string;
  /** Adicional (juros) em R$; vazio = sem adicional. */
  extra: string;
  paymentMethodId: string;
  paymentMode: PaymentMode | '';
}

export type FiadoPaymentResult =
  { ok: true; input: FiadoPaymentInput } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false, error }) as const;

/**
 * As teclas do Receber: as formas ativas sem a fiado (não se paga fiado com fiado) e sem a
 * conta aberta (2026-10-25).
 *
 * @example receiveMethods(day.paymentMethods).map((m) => m.name) // ['PIX', 'Dinheiro']
 */
export function receiveMethods(methods: PaymentMethod[]): PaymentMethod[] {
  return methods.filter((method) => method.active && !method.isFiado);
}

/** Adicional digitado: '' sem adicional, o valor da API, ou null se inválido. */
function typedExtra(typed: string): string | null {
  if (!typed.trim()) return '';
  return toApiMoney(typed);
}

type ReceivedMoney =
  { ok: true; amount: string; extra: string } | { ok: false; error: string };

/** O valor (maior que zero) e o adicional digitados, no formato da API. */
function receivedMoney(values: ReceiveFiadoValues): ReceivedMoney {
  const amount = toApiMoney(values.amount);
  if (!values.amount.trim() || (amount !== null && moneyToCents(amount) === 0))
    return fail('Informe quanto o cliente pagou');
  if (amount === null)
    return fail(
      `Valor inválido "${values.amount}": digite só números (ex.: 20,00)`,
    );
  const extra = typedExtra(values.extra);
  if (extra === null)
    return fail(
      `Adicional inválido "${values.extra}": digite só números (ex.: 5,00) ou deixe vazio`,
    );
  return { ok: true, amount, extra };
}

/**
 * Valida o Receber e monta o corpo. O teto (o que falta) quem confere é a API (422 com o máximo).
 *
 * @example buildFiadoPayment({ amount: '20,00', extra: '', paymentMethodId: '1', paymentMode: '' }, methods)
 */
export function buildFiadoPayment(
  values: ReceiveFiadoValues,
  methods: PaymentMethod[],
): FiadoPaymentResult {
  const money = receivedMoney(values);
  if (!money.ok) return money;
  const { amount, extra } = money;
  if (!values.paymentMethodId)
    return fail(
      `Escolha a forma do pagamento (teclas 1 a ${receiveMethods(methods).length})`,
    );
  const modeMissing = missingPaymentMode(values, methods);
  if (modeMissing) return fail(modeMissing);
  const input: FiadoPaymentInput = {
    amount,
    ...(extra && moneyToCents(extra) > 0 && { extra }),
    paymentMethodId: Number(values.paymentMethodId),
    ...(values.paymentMode && { paymentMode: values.paymentMode }),
  };
  return { ok: true, input };
}
