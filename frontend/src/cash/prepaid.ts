import type { PaymentMethod } from '../api/types';
import type { OrderFormValues } from './order-form-values';
import { OPEN_ACCOUNT, SPLIT } from './payment-choice';

/** A forma escolhida no formulário; nenhuma com o campo vazio, A pagar ou Dividir. */
function singleMethod(
  methodId: string,
  methods: PaymentMethod[],
): PaymentMethod | undefined {
  if (!methodId || methodId === OPEN_ACCOUNT || methodId === SPLIT)
    return undefined;
  return methods.find((entry) => String(entry.id) === methodId);
}

/**
 * Padrão da tecla PAGO ao escolher a forma de pagamento: ligado só para
 * forma sem cobrança na porta (não é dinheiro, maquininha, fiado nem iFood;
 * hoje, o PIX).
 *
 * @example prepaidByDefault('1', methods) // true
 */
export function prepaidByDefault(
  methodId: string,
  methods: PaymentMethod[],
): boolean {
  const method = singleMethod(methodId, methods);
  if (!method) return false;
  return (
    !method.isCash &&
    !method.isCardTerminal &&
    !method.isFiado &&
    !method.isIfood
  );
}

/**
 * Indica se a tecla PAGO pode ser exibida ou aplicada: somente na entrega,
 * com uma forma de pagamento escolhida que não seja fiado nem Dividir.
 *
 * @example prepaidAllowed({ type: 'DELIVERY', paymentMethodId: '1' }, methods) // true
 */
export function prepaidAllowed(
  values: Pick<OrderFormValues, 'type' | 'paymentMethodId'>,
  methods: PaymentMethod[],
): boolean {
  if (values.type !== 'DELIVERY') return false;
  const method = singleMethod(values.paymentMethodId, methods);
  return method !== undefined && !method.isFiado && !method.isIfood;
}
