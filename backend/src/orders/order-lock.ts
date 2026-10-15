import { toCents } from '../common/money.js';
import type { OrderRecord } from './order-repository.js';

/**
 * Se o pedido já saiu da mão do caixa (2026-10-15): fora de "Em preparo E com até `minutes`
 * de lançado", cancelar, baixar o valor ou trocar a forma pedem a senha do admin. O tempo fecha
 * a brecha de deixar o pedido "Em preparo" para sempre; 0 = sempre pedir.
 *
 * @example isLockedForCashier({ status: 'PREPARING', createdAt }, agora, 15) // false nos 15 min
 */
export function isLockedForCashier(
  order: Pick<OrderRecord, 'status' | 'createdAt'>,
  now: Date,
  minutes: number,
): boolean {
  const ageMs = now.getTime() - order.createdAt.getTime();
  return !(order.status === 'PREPARING' && ageMs < minutes * 60_000);
}

/** O que a edição muda que interessa à trava: o valor e a forma de pagamento. */
type MoneySide = Pick<OrderRecord, 'amount' | 'paymentMethodId'>;

/**
 * Edição que mexe no dinheiro (2026-10-15): baixar o valor ou trocar a forma de pagamento
 * (Dinheiro → PIX era o caixa 2). Acrescentar, trocar por igual ou maior e dar forma ao
 * "A pagar" são livres; trocar só o meio da mesma maquininha também.
 *
 * @example isSensitiveEdit({ amount: '30.00', paymentMethodId: 1 }, { amount: '25.00', paymentMethodId: 1 }) // true
 */
export function isSensitiveEdit(before: MoneySide, after: MoneySide): boolean {
  if (toCents(after.amount) < toCents(before.amount)) return true;
  return (
    before.paymentMethodId !== null &&
    after.paymentMethodId !== before.paymentMethodId
  );
}
