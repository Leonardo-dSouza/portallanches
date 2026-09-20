import type { CashApi } from '../api/cash-api';
import type { Order } from '../api/types';
import type { OrderRequest } from './order-form-values';

/**
 * Grava o pedido; se o bairro é novo, cadastra antes (a taxa digitada vira o
 * padrão dele) e o pedido copia essa taxa.
 *
 * @example await saveOrderRequest(cash, null, request);
 */
export async function saveOrderRequest(
  cash: CashApi,
  orderId: number | null,
  request: OrderRequest,
): Promise<Order> {
  if (!request.newZone) return cash.saveOrder(orderId, request.input);
  const zone = await cash.createDeliveryZone(
    request.newZone.neighborhood,
    request.newZone.fee,
  );
  return cash.saveOrder(orderId, { ...request.input, deliveryZoneId: zone.id });
}
