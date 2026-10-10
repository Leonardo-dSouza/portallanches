import type { PaymentMethod, PaymentMode } from '../api/types';
import type { OrderFormValues } from './order-form-values';

/**
 * Tecla 0 do balcão (2026-10-10): conta aberta no nome, paga no fim. Fica no lugar do id da
 * forma em `OrderFormValues.paymentMethodId`; vai para a API como `paymentMethodId: null`.
 */
export const OPEN_ACCOUNT = 'aberto';

/** Meios da maquininha na ordem das teclas (1 a 3), com o nome que o caixa vê. */
export const PAYMENT_MODES: readonly { mode: PaymentMode; label: string }[] = [
  { mode: 'CREDIT', label: 'Crédito' },
  { mode: 'DEBIT', label: 'Débito' },
  { mode: 'PIX', label: 'PIX' },
];

/** @example paymentModeLabel('DEBIT') // 'Débito' */
export function paymentModeLabel(mode: PaymentMode): string {
  return PAYMENT_MODES.find((entry) => entry.mode === mode)?.label ?? mode;
}

/**
 * Forma de pagamento como aparece na lista de pedidos.
 *
 * @example describePayment(tom, 'CREDIT') // 'Maquininha Ton · Crédito'
 */
export function describePayment(
  method: PaymentMethod | undefined,
  mode: PaymentMode | null,
): string {
  if (!method) return '—';
  return mode ? `${method.name} · ${paymentModeLabel(mode)}` : method.name;
}

/**
 * Maquininha escolhida sem o meio: a mensagem para o caixa; null quando está completo.
 *
 * @example missingPaymentMode({ paymentMethodId: '3', paymentMode: '' }, methods) // 'Escolha crédito, …'
 */
export function missingPaymentMode(
  values: Pick<OrderFormValues, 'paymentMethodId' | 'paymentMode'>,
  methods: PaymentMethod[],
): string | null {
  const method = methods.find((m) => String(m.id) === values.paymentMethodId);
  if (!method?.isCardTerminal || values.paymentMode) return null;
  return `Escolha crédito, débito ou PIX na ${method.name} (teclas 1 a 3)`;
}
