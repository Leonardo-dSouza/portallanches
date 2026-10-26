import { ApiError } from '../api/api-client';
import type { PaymentMethod } from '../api/types';

/**
 * Nome repetido (sem distinguir maiúsculas) vira 409, como a chave única do banco.
 *
 * @example assertNameFree(zones.map((z) => z.neighborhood), 'Centro')
 */
export function assertNameFree(others: string[], name: string): void {
  if (others.some((other) => other.toLowerCase() === name.toLowerCase()))
    throw new ApiError(409, 'Já existe um registro com o mesmo valor');
}

/**
 * Forma de pagamento gravada a partir do corpo, como o backend devolve.
 *
 * @example fakePaymentFrom({ name: 'PIX', active: true, sortOrder: 1, isCardTerminal: false }, 7)
 */
export function fakePaymentFrom(
  body: Record<string, unknown>,
  id: number,
): PaymentMethod {
  return {
    id,
    name: String(body.name),
    active: Boolean(body.active),
    sortOrder: Number(body.sortOrder),
    isCardTerminal: Boolean(body.isCardTerminal),
    isCash: Boolean(body.isCash),
    isFiado: Boolean(body.isFiado),
  };
}

/**
 * `PUT /payment-methods/order`: `sortOrder` = posição (1, 2, 3…) e a lista volta na ordem nova,
 * como o backend.
 *
 * @example reorderedPayments(methods, [2, 1])[0].id // 2
 */
export function reorderedPayments(
  methods: PaymentMethod[],
  ids: number[],
): PaymentMethod[] {
  return ids
    .map((id) => methods.find((method) => method.id === id))
    .filter((method): method is PaymentMethod => method !== undefined)
    .map((method, index) => ({ ...method, sortOrder: index + 1 }));
}

/**
 * Forma criada (POST) ou editada (PUT) na lista, com o 409 de nome repetido entre as outras.
 *
 * @example withSavedPayment(methods, fakePaymentFrom(body, 7), 'POST')
 */
export function withSavedPayment(
  methods: PaymentMethod[],
  method: PaymentMethod,
  how: 'POST' | 'PUT',
): PaymentMethod[] {
  const others = methods.filter((m) => m.id !== method.id);
  assertNameFree(
    others.map((m) => m.name),
    method.name,
  );
  return how === 'POST'
    ? [...methods, method]
    : methods.map((m) => (m.id === method.id ? method : m));
}
