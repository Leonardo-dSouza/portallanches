import { toApiMoney } from '../api/money';
import type { DeliveryZone, Order, OrderInput, OrderType } from '../api/types';
import { toNeighborhoodKey } from './neighborhood-key';

/** Campos do formulário como o caixa os digita (tudo texto). */
export interface OrderFormValues {
  type: OrderType;
  amount: string;
  paymentMethodId: string;
  neighborhood: string;
  fee: string;
}

export interface NewZone {
  neighborhood: string;
  fee: string;
}

/** Bairro novo a cadastrar antes de gravar o pedido (`newZone`) e o corpo do pedido. */
export interface OrderRequest {
  newZone: NewZone | null;
  input: OrderInput;
}

export type BuildResult =
  { ok: true; request: OrderRequest } | { ok: false; error: string };

const fail = (error: string): BuildResult => ({ ok: false, error });

export const EMPTY_ORDER_FORM: OrderFormValues = {
  type: 'COUNTER',
  amount: '',
  paymentMethodId: '',
  neighborhood: '',
  fee: '',
};

export const typedMoney = (apiMoney: string): string =>
  apiMoney.replace('.', ',');

/** Preenche o formulário com um pedido existente, para edição. */
export function formValuesOf(
  order: Order,
  zones: DeliveryZone[],
): OrderFormValues {
  const zone = zones.find((z) => z.id === order.deliveryZoneId);
  return {
    // Pedido importado não tem tipo nem pagamento: o caixa escolhe ao corrigir.
    type: order.type ?? 'COUNTER',
    amount: typedMoney(order.amount),
    paymentMethodId:
      order.paymentMethodId === null ? '' : String(order.paymentMethodId),
    neighborhood: zone?.neighborhood ?? '',
    fee:
      order.type === 'DELIVERY' && order.deliveryFee
        ? typedMoney(order.deliveryFee)
        : '',
  };
}

export function findZone(zones: DeliveryZone[], typed: string) {
  const key = toNeighborhoodKey(typed);
  return zones.find((zone) => zone.neighborhoodKey === key);
}

function deliveryRequest(
  base: OrderInput,
  values: OrderFormValues,
  zones: DeliveryZone[],
): BuildResult {
  const neighborhood = values.neighborhood.trim();
  if (!neighborhood) return fail('Informe o bairro da entrega');
  const typedFee = values.fee.trim();
  const fee = typedFee ? toApiMoney(typedFee) : null;
  if (typedFee && fee === null)
    return fail(`Taxa inválida "${values.fee}": digite só números (ex.: 8,00)`);
  const zone = findZone(zones, neighborhood);
  if (!zone) {
    if (fee === null)
      return fail(`Informe a taxa do bairro novo "${neighborhood}"`);
    return {
      ok: true,
      request: { newZone: { neighborhood, fee }, input: base },
    };
  }
  if (!zone.active) return fail(`O bairro "${zone.neighborhood}" está inativo`);
  const override = fee !== null && fee !== zone.fee ? { deliveryFee: fee } : {};
  const input = { ...base, deliveryZoneId: zone.id, ...override };
  return { ok: true, request: { newZone: null, input } };
}

/**
 * Valida o formulário e monta o pedido. Bairro desconhecido vira `newZone`
 * (a taxa digitada será o padrão dele); bairro conhecido só envia `deliveryFee`
 * quando a taxa digitada difere da padrão (vale só para este pedido).
 *
 * @example buildOrderRequest({ type: 'COUNTER', amount: '25,50', paymentMethodId: '1', neighborhood: '', fee: '' }, [])
 */
export function buildOrderRequest(
  values: OrderFormValues,
  zones: DeliveryZone[],
): BuildResult {
  const amount = toApiMoney(values.amount);
  if (amount === null)
    return fail(
      `Valor inválido "${values.amount}": digite só números, com vírgula para os centavos (ex.: 25,50)`,
    );
  if (!values.paymentMethodId) return fail('Escolha a forma de pagamento');
  const base: OrderInput = {
    amount,
    type: values.type,
    paymentMethodId: Number(values.paymentMethodId),
  };
  if (values.type === 'COUNTER')
    return { ok: true, request: { newZone: null, input: base } };
  return deliveryRequest(base, values, zones);
}
