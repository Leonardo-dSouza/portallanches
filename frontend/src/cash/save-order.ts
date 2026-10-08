import type { CashApi } from '../api/cash-api';
import type { Order } from '../api/types';
import type { CustomerDraft } from './customer-draft';
import type { OrderRequest } from './order-form-values';

async function resolveZoneId(
  cash: CashApi,
  request: OrderRequest,
): Promise<number> {
  if (!request.newZone) return request.zoneId as number;
  const { neighborhood, fee } = request.newZone;
  return (await cash.createDeliveryZone(neighborhood, fee)).id;
}

/** Reaproveita o cliente sem mudanças; senão cadastra (novo) ou atualiza (endereço novo). */
async function resolveCustomerId(
  cash: CashApi,
  draft: CustomerDraft,
  deliveryZoneId: number,
): Promise<number> {
  if (draft.id !== null && !draft.changed) return draft.id;
  const { name, phone, street, number, reference } = draft;
  const input = { name, phone, street, number, reference, deliveryZoneId };
  return (await cash.saveCustomer(draft.id, input)).id;
}

/**
 * Grava o pedido. Na entrega grava antes o bairro novo (a taxa digitada vira o padrão
 * dele) e o cliente; o pedido leva o `customerId` e o servidor copia os dados dele.
 *
 * @example await saveOrderRequest(cash, null, request);
 */
export async function saveOrderRequest(
  cash: CashApi,
  orderId: number | null,
  request: OrderRequest,
): Promise<Order> {
  if (!request.customer) return cash.saveOrder(orderId, request.input);
  const zoneId = await resolveZoneId(cash, request);
  const customerId = await resolveCustomerId(cash, request.customer, zoneId);
  return cash.saveOrder(orderId, { ...request.input, customerId });
}
