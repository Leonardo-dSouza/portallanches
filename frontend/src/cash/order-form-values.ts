import { toApiMoney } from '../api/money';
import type {
  Customer,
  DeliveryZone,
  Order,
  OrderInput,
  OrderType,
  PaymentMethod,
  PaymentMode,
} from '../api/types';
import {
  buildCounterCustomerDraft,
  buildCustomerDraft,
  type CustomerDraft,
  type CustomerFields,
} from './customer-draft';
import { itemsRequestOf, NO_ITEMS_ERROR } from './item-request';
import { toNeighborhoodKey } from './neighborhood-key';
import type { DraftLine } from './order-lines';
import { isFiadoChoice, OPEN_ACCOUNT } from './payment-choice';

/** Campos do formulário como o caixa os digita (tudo texto); os itens ficam em `DraftLine[]`. */
export interface OrderFormValues extends CustomerFields {
  type: OrderType;
  /** Id da forma, `OPEN_ACCOUNT` (conta aberta no balcão) ou vazio. */
  paymentMethodId: string;
  /** Nome no balcão (opcional; obrigatório na conta aberta). */
  counterName: string;
  /** "Troco para" da entrega em dinheiro, como digitado. */
  changeFor: string;
  /** Meio na maquininha; vazio nas outras formas (ou enquanto o caixa não escolheu). */
  paymentMode: PaymentMode | '';
  neighborhood: string;
  fee: string;
  /** "Pagar em" do fiado (`AAAA-MM-DD`); '' = sem data. Só vai na forma fiado. */
  fiadoDueDate: string;
}

export interface NewZone {
  neighborhood: string;
  fee: string;
}

/**
 * O que gravar, em ordem: bairro novo (`newZone`), cliente (`customer`, na entrega e no fiado do
 * balcão) e o pedido. `zoneId` é o bairro já cadastrado; null quando é bairro novo ou balcão (no
 * fiado do balcão, o bairro que o cliente achado já tinha).
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
  counterName: '',
  changeFor: '',
  paymentMode: '',
  neighborhood: '',
  fee: '',
  phone: '',
  customerName: '',
  street: '',
  houseNumber: '',
  reference: '',
  fiadoDueDate: '',
};

export const typedMoney = (apiMoney: string): string =>
  apiMoney.replace('.', ',');

/** Preenche o formulário com um pedido existente, para edição. */
export function formValuesOf(
  order: Order,
  zones: DeliveryZone[],
): OrderFormValues {
  const zone = zones.find((z) => z.id === order.deliveryZoneId);
  // O balcão com cliente (fiado) mostra o cliente; sem ele, o nome digitado no balcão.
  const isCounter = order.type === 'COUNTER' && order.customerId === null;
  return {
    // Pedido importado não tem tipo nem pagamento: o caixa escolhe ao corrigir.
    type: order.type ?? 'COUNTER',
    paymentMethodId: paymentChoiceOf(order),
    counterName: isCounter ? (order.customerName ?? '') : '',
    changeFor: order.changeFor ? typedMoney(order.changeFor) : '',
    paymentMode: order.paymentMode ?? '',
    neighborhood: zone?.neighborhood ?? '',
    fee:
      order.type === 'DELIVERY' && order.deliveryFee
        ? typedMoney(order.deliveryFee)
        : '',
    phone: order.customerPhone ?? '',
    customerName: isCounter ? '' : (order.customerName ?? ''),
    street: order.customerStreet ?? '',
    houseNumber: order.customerNumber ?? '',
    reference: order.customerReference ?? '',
    fiadoDueDate: order.fiadoDueDate ?? '',
  };
}

/** Tecla do pagamento de um pedido gravado: a conta aberta vira a tecla Aberto. */
function paymentChoiceOf(order: Order): string {
  if (order.paymentMethodId !== null) return String(order.paymentMethodId);
  return order.type === 'COUNTER' ? OPEN_ACCOUNT : '';
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
    return {
      ...values,
      paymentMethodId: value,
      paymentMode: '',
      changeFor: '',
    };
  if (field === 'type') return withOrderType(values, value as OrderType);
  if (field !== 'neighborhood') return { ...values, [field]: value };
  const zone = findZone(zones, value);
  return {
    ...values,
    neighborhood: value,
    fee: zone ? typedMoney(zone.fee) : '',
  };
}

/** Trocar o tipo: a entrega não fica aberta, então o Aberto do balcão sai. */
function withOrderType(
  values: OrderFormValues,
  type: OrderType,
): OrderFormValues {
  const leavesOpen =
    type === 'DELIVERY' && values.paymentMethodId === OPEN_ACCOUNT;
  return {
    ...values,
    type,
    ...(leavesOpen && { paymentMethodId: '' }),
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
  const changeFor = typedChangeFor(values.changeFor);
  if (changeFor === undefined)
    return fail(
      `Troco inválido "${values.changeFor}": digite só números (ex.: 50,00)`,
    );
  const input = {
    ...base,
    ...(deliveryFee !== null && { deliveryFee }),
    ...(changeFor && { changeFor }),
  };
  return {
    ok: true,
    request: { newZone, zoneId, customer: customer.draft, input },
  };
}

/** Linha da comanda no corpo da API: observação e adicionais só quando existem. */
/**
 * Valida o formulário e monta o pedido. O preço não vai: a API usa o do cadastro.
 * Bairro desconhecido vira `newZone` (a taxa digitada será o padrão dele); bairro
 * conhecido só envia `deliveryFee` quando a taxa digitada difere da padrão (vale só
 * para este pedido). `known` é o cliente achado pelo telefone ou nome (ou o do pedido
 * em edição); `methods` diz se a forma escolhida é o fiado.
 *
 * @example buildOrderRequest({ ...EMPTY_ORDER_FORM, paymentMethodId: '1' }, lines, [], null, methods)
 */
export function buildOrderRequest(
  values: OrderFormValues,
  lines: DraftLine[],
  zones: DeliveryZone[],
  known: Customer | null,
  methods: PaymentMethod[],
): BuildResult {
  if (lines.length === 0) return fail(NO_ITEMS_ERROR);
  if (!values.paymentMethodId)
    return fail('Escolha a forma de pagamento (teclas 1 a 4)');
  const open = values.paymentMethodId === OPEN_ACCOUNT;
  const fiado = isFiadoChoice(values.paymentMethodId, methods);
  const base: OrderInput = {
    items: itemsRequestOf(lines),
    type: values.type,
    paymentMethodId: open ? null : Number(values.paymentMethodId),
    ...(values.paymentMode && { paymentMode: values.paymentMode }),
    ...(fiado && values.fiadoDueDate && { fiadoDueDate: values.fiadoDueDate }),
  };
  if (values.type === 'DELIVERY')
    return deliveryRequest(base, values, zones, known);
  if (fiado) return fiadoCounterRequest(base, values, known);
  return counterRequest(base, values);
}

/** Fiado no balcão (2026-10-25): o cliente no lugar do nome; a API copia nome e telefone dele. */
function fiadoCounterRequest(
  base: OrderInput,
  values: OrderFormValues,
  known: Customer | null,
): BuildResult {
  const customer = buildCounterCustomerDraft(values, known);
  if (!customer.ok) return customer;
  const zoneId = known?.deliveryZoneId ?? null;
  return {
    ok: true,
    request: { newZone: null, zoneId, customer: customer.draft, input: base },
  };
}

/** Balcão: o nome digitado vai junto; a conta aberta exige o nome. */
function counterRequest(
  base: OrderInput,
  values: OrderFormValues,
): BuildResult {
  const counterName = values.counterName.trim();
  if (base.paymentMethodId === null && !counterName)
    return fail(
      '"A pagar" precisa do nome: digite o nome da pessoa no campo Nome',
    );
  const input = counterName ? { ...base, counterName } : base;
  return {
    ok: true,
    request: { newZone: null, zoneId: null, customer: null, input },
  };
}

/** "Troco para" digitado: '' sem troco, o valor da API, ou undefined se inválido. */
function typedChangeFor(typed: string): string | undefined {
  if (!typed.trim()) return '';
  return toApiMoney(typed) ?? undefined;
}
