import type { FiadoPaymentSnapshot } from '../orders/order-events.js';
import type { FiadoPaymentRecord } from './fiado-repository.js';

/**
 * O recebimento como o histórico do pedido guarda (2026-10-25): quanto, como e em que noite.
 *
 * @example paymentSnapshot(payment) // { paymentId: 3, amount: '20.00', extra: '5.00', … }
 */
export function paymentSnapshot(
  payment: FiadoPaymentRecord,
): FiadoPaymentSnapshot {
  return {
    paymentId: payment.id,
    amount: payment.amount,
    extra: payment.extra,
    paymentMethodId: payment.paymentMethodId,
    paymentMode: payment.paymentMode,
    businessDate: payment.businessDate,
  };
}
