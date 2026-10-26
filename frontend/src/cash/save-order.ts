import type { CashApi } from '../api/cash-api';
import type { CustomerInput, SavedOrder } from '../api/types';
import type { CustomerDraft } from './customer-draft';
import type { OrderRequest } from './order-form-values';

async function resolveZoneId(
  cash: CashApi,
  request: OrderRequest,
): Promise<number | null> {
  if (!request.newZone) return request.zoneId;
  const { neighborhood, fee } = request.newZone;
  return (await cash.createDeliveryZone(neighborhood, fee)).id;
}

type CustomerAddress = Omit<CustomerInput, 'name' | 'phone'>;

/**
 * O endereço a regravar com o cliente. O pedido do balcão só copia nome e telefone (2026-10-25),
 * então o fiado do balcão em edição não sabe se o cliente tem endereço: confere o cadastro pelo
 * telefone antes, para não apagar o endereço de quem também pede entrega.
 */
async function addressToKeep(
  cash: CashApi,
  draft: CustomerDraft,
  deliveryZoneId: number | null,
): Promise<CustomerAddress> {
  const { street, number, reference } = draft;
  const typed = { street, number, reference, deliveryZoneId };
  if (draft.id === null || street !== null || !draft.phone) return typed;
  const found = await cash.findCustomersByPhone(draft.phone);
  const onFile = found.find((customer) => customer.id === draft.id);
  if (!onFile) return typed;
  const { name: _name, phone: _phone, id: _id, ...address } = onFile;
  return address;
}

/** Reaproveita o cliente sem mudanças; senão cadastra (novo) ou atualiza (endereço novo). */
async function resolveCustomerId(
  cash: CashApi,
  draft: CustomerDraft,
  deliveryZoneId: number | null,
): Promise<number> {
  if (draft.id !== null && !draft.changed) return draft.id;
  const address = await addressToKeep(cash, draft, deliveryZoneId);
  const input = { name: draft.name, phone: draft.phone, ...address };
  return (await cash.saveCustomer(draft.id, input)).id;
}

/**
 * Grava o pedido. Na entrega grava antes o bairro novo (a taxa digitada vira o padrão
 * dele) e o cliente (no fiado do balcão, só o cliente); o pedido leva o `customerId` e o
 * servidor copia os dados dele. A senha do admin vai junto quando a edição fora da trava pediu.
 *
 * @example await saveOrderRequest(cash, null, request);
 */
export async function saveOrderRequest(
  cash: CashApi,
  orderId: number | null,
  request: OrderRequest,
  managerPassword?: string,
): Promise<SavedOrder> {
  const input = managerPassword
    ? { ...request.input, managerPassword }
    : request.input;
  if (!request.customer) return cash.saveOrder(orderId, input);
  const zoneId = await resolveZoneId(cash, request);
  const customerId = await resolveCustomerId(cash, request.customer, zoneId);
  return cash.saveOrder(orderId, { ...input, customerId });
}
