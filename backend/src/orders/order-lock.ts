import { toCents } from '../common/money.js';
import type { OrderRecord } from './order-repository.js';
import type { OrderStatus } from './order-status.js';
import { isSplitPayment, type PaymentPart } from './payment-parts.js';

/**
 * O que a trava olha: quando foi lançado e, no pedido, o status. O recebimento de fiado
 * (2026-10-25) não tem status: só o tempo conta.
 */
export interface LockSubject {
  createdAt: Date;
  status?: OrderStatus;
}

/**
 * Se o pedido (ou o recebimento) já saiu da mão do caixa (2026-10-15): fora de "Em preparo E
 * com até `minutes` de lançado", cancelar, estornar, baixar o valor ou trocar a forma pedem a
 * senha do admin. O tempo fecha a brecha de deixar o pedido "Em preparo" para sempre; 0 =
 * sempre pedir.
 *
 * @example isLockedForCashier({ status: 'PREPARING', createdAt }, agora, 15) // false nos 15 min
 */
export function isLockedForCashier(
  subject: LockSubject,
  now: Date,
  minutes: number,
): boolean {
  const ageMs = now.getTime() - subject.createdAt.getTime();
  const preparing =
    subject.status === undefined || subject.status === 'PREPARING';
  return !(preparing && ageMs < minutes * 60_000);
}

/** O que a edição muda que interessa à trava: o valor, a forma e as partes. */
export type MoneySide = Pick<OrderRecord, 'amount' | 'paymentMethodId'> & {
  paymentParts?: readonly PaymentPart[];
};

/**
 * Quanto cada forma recebeu, em centavos (card 2): o pedido de uma forma tem o total nela. O meio
 * da maquininha fica de fora de propósito: trocar crédito por débito na mesma Ton é livre.
 */
function slicesByMethod(side: MoneySide): Map<number, number> {
  const slices = new Map<number, number>();
  const parts = isSplitPayment(side) ? (side.paymentParts ?? []) : [side];
  for (const part of parts) {
    if (part.paymentMethodId === null) continue;
    const current = slices.get(part.paymentMethodId) ?? 0;
    slices.set(part.paymentMethodId, current + toCents(part.amount));
  }
  return slices;
}

function hasLostSlice(
  beforeSlices: Map<number, number>,
  afterSlices: Map<number, number>,
): boolean {
  for (const [methodId, beforeCents] of beforeSlices) {
    const afterCents = afterSlices.get(methodId) ?? 0;
    if (afterCents < beforeCents) return true;
  }
  return false;
}

/**
 * Edição que mexe no dinheiro (2026-10-15; card 2 em 2026-11-08): baixar o valor ou perder valor
 * em qualquer forma ("Dinheiro → PIX era o caixa 2"). Acrescentar valor numa parte e dar forma ao
 * A pagar continuam livres; trocar só o meio da mesma maquininha também não conta.
 *
 * @example isSensitiveEdit({ amount: '30.00', paymentMethodId: 1 }, { amount: '25.00', paymentMethodId: 1 }) // true
 */
export function isSensitiveEdit(before: MoneySide, after: MoneySide): boolean {
  if (toCents(after.amount) < toCents(before.amount)) return true;
  if (before.paymentMethodId === null) return false;
  return hasLostSlice(slicesByMethod(before), slicesByMethod(after));
}
