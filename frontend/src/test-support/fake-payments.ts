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
  };
}
