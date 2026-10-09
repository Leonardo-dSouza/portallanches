import { toApiMoney } from '../api/money';
import type {
  Customer,
  DeliveryZone,
  Order,
  OrderInput,
  OrderType,
  PaymentMode,
} from '../api/types';
import {
  buildCustomerDraft,
  type CustomerDraft,
  type CustomerFields,
} from './customer-draft';
import { toNeighborhoodKey } from './neighborhood-key';
import type { DraftLine } from './order-lines';

/** Campos do formulário como o caixa os digita (tudo texto); os itens ficam em `DraftLine[]`. */
export interface OrderFormValues extends CustomerFields {
  type: OrderType;
  paymentMethodId: string;
  /** Meio na maquininha; vazio nas outras formas (ou enquanto o caixa não escolheu). */
  paymentMode: PaymentMode | '';
  neighborhood: string;
  fee: string;
}

export interface NewZone {
  neighborhood: string;
  fee: string;
}

/**
 * O que gravar, em ordem: bairro novo (`newZone`), cliente (`customer`, só na entrega) e o
 * pedido. `zoneId` é o bairro já cadastrado; null quando é bairro novo ou balcão.
 */
export interface OrderRequest {
  newZone: NewZone | null;
  zoneId: number | null;
  customer: CustomerDraft | null;
  input: OrderInput;
}

export type BuildResult =
  { ok: true; request: OrderRequest } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false, error }) as const;

export const EMPTY_ORDER_FORM: OrderFormValues = {
  type: 'COUNTER',
  paymentMethodId: '',
  paymentMode: '',
  neighborhood: '',
  fee: '',
  phone: '',
  customerName: '',
  street: '',
  houseNumber: '',
  reference: '',
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
    paymentMethodId:
      order.paymentMethodId === null ? '' : String(order.paymentMethodId),
    paymentMode: order.paymentMode ?? '',
    neighborhood: zone?.neighborhood ?? '',
    fee:
      order.type === 'DELIVERY' && order.deliveryFee
        ? typedMoney(order.deliveryFee)
        : '',
    phone: order.customerPhone ?? '',
    customerName: order.customerName ?? '',
    street: order.customerStreet ?? '',
    houseNumber: order.customerNumber ?? '',
    reference: order.customerReference ?? '',
  };
}

export function findZone(zones: DeliveryZone[], typed: string) {
  const key = toNeighborhoodKey(typed);
  return zones.find((zone) => zone.neighborhoodKey === key);
}

/**
 * Valor digitado num campo. Ao mudar o bairro, a taxa vira a padrão dele (ou vazia se o bairro
 * é novo); ao mudar a forma de pagamento, o meio escolhido (era da maquininha anterior) é limpo.
 *
 * @example withOrderField(values, 'neighborhood', 'Centro', zones).fee // '5,00'
 */
export function withOrderField(
  values: OrderFormValues,
  field: keyof OrderFormValues,
  value: string,
  zones: DeliveryZone[],
): OrderFormValues {
  if (field === 'paymentMethodId')
    return { ...values, paymentMethodId: value, paymentMode: '' };
  if (field !== 'neighborhood') return { ...values, [field]: value };
  const zone = findZone(zones, value);
  return {
    ...values,
    neighborhood: value,
    fee: zone ? typedMoney(zone.fee) : '',
  };
}

interface ZoneChoice {
  newZone: NewZone | null;
  zoneId: number | null;
  deliveryFee: string | null;
}

type ZoneResult = { ok: true; zone: ZoneChoice } | { ok: false; error: string };

/** Bairro digitado: conhecido (com taxa sobrescrita opcional) ou novo (a taxa vira o padrão). */
function chooseZone(
  values: OrderFormValues,
  zones: DeliveryZone[],
): ZoneResult {
  const neighborhood = values.neighborhood.trim();
  if (!neighborhood) return { ok: false, error: 'Informe o bairro da entrega' };
  const typedFee = values.fee.trim();
  const fee = typedFee ? toApiMoney(typedFee) : null;
  if (typedFee && fee === null)
    return fail(`Taxa inválida "${values.fee}": digite só números (ex.: 8,00)`);
  const zone = findZone(zones, neighborhood);
  if (!zone) {
    if (fee === null)
      return fail(`Informe a taxa do bairro novo "${neighborhood}"`);
    const newZone = { neighborhood, fee };
    return { ok: true, zone: { newZone, zoneId: null, deliveryFee: null } };
  }
  if (!zone.active) return fail(`O bairro "${zone.neighborhood}" está inativo`);
  const override = fee !== null && fee !== zone.fee ? fee : null;
  return {
    ok: true,
    zone: { newZone: null, zoneId: zone.id, deliveryFee: override },
  };
}

function deliveryRequest(
  base: OrderInput,
  values: OrderFormValues,
  zones: DeliveryZone[],
  known: Customer | null,
): BuildResult {
  const chosen = chooseZone(values, zones);
  if (!chosen.ok) return chosen;
  const { newZone, zoneId, deliveryFee } = chosen.zone;
  const customer = buildCustomerDraft(values, known, zoneId);
  if (!customer.ok) return customer;
  const input = deliveryFee === null ? base : { ...base, deliveryFee };
  return {
    ok: true,
    request: { newZone, zoneId, customer: customer.draft, input },
  };
}

/**
 * Valida o formulário e monta o pedido. O preço não vai: a API usa o do cadastro.
 * Bairro desconhecido vira `newZone` (a taxa digitada será o padrão dele); bairro
 * conhecido só envia `deliveryFee` quando a taxa digitada difere da padrão (vale só
 * para este pedido). Na entrega, `known` é o cliente achado pelo telefone (ou o do
 * pedido em edição).
 *
 * @example buildOrderRequest({ ...EMPTY_ORDER_FORM, paymentMethodId: '1' }, lines, [], null)
 */
export function buildOrderRequest(
  values: OrderFormValues,
  lines: DraftLine[],
  zones: DeliveryZone[],
  known: Customer | null,
): BuildResult {
  if (lines.length === 0)
    return fail(
      'Lance pelo menos um item: o número do lanche (9, 9. artesanal) ou parte do nome',
    );
  if (!values.paymentMethodId)
    return fail('Escolha a forma de pagamento (teclas 1 a 4)');
  const base: OrderInput = {
    items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    type: values.type,
    paymentMethodId: Number(values.paymentMethodId),
    ...(values.paymentMode && { paymentMode: values.paymentMode }),
  };
  if (values.type === 'COUNTER')
    return {
      ok: true,
      request: { newZone: null, zoneId: null, customer: null, input: base },
    };
  return deliveryRequest(base, values, zones, known);
}
