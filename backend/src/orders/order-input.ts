import { BadRequestException } from '@nestjs/common';
import {
  parseBoolean,
  parseChoice,
  parseId,
  parseObject,
  parseText,
} from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import { parseBusinessDate } from '../closing/business-date.js';
import { parseOrderItems, type OrderItemInput } from './order-item-input.js';
import { parseSplitChoice, type PaymentPart } from './payment-parts.js';
import { describeReceived } from '../common/received-value.js';

/** iFood (2026-11-23): o entregador do iFood retira; sem endereço, taxa nem forma escolhida. */
export type OrderType = 'DELIVERY' | 'COUNTER' | 'IFOOD';
const ORDER_TYPES: readonly OrderType[] = ['DELIVERY', 'COUNTER', 'IFOOD'];

/** Meio usado na maquininha; só existe quando a forma de pagamento é maquininha. */
export type PaymentMode = 'CREDIT' | 'DEBIT' | 'PIX';
const PAYMENT_MODES: readonly PaymentMode[] = ['CREDIT', 'DEBIT', 'PIX'];

/** Opção de consumo do balcão (2026-11-08: a chapa precisa saber se embala). */
export type DiningOption = 'EAT_IN' | 'TAKEAWAY';
const DINING_OPTIONS: readonly DiningOption[] = ['EAT_IN', 'TAKEAWAY'];

/** Nome no balcão: o caixa chama a pessoa por ele (conta aberta ou "pedido pelo nome"). */
const MAX_COUNTER_NAME_LENGTH = 40;

/** Nº do pedido no app do iFood: curto, só para achar o pedido lá (coluna VARCHAR(10)). */
const MAX_IFOOD_CODE_LENGTH = 10;

/** Corpo de pedido já validado (formato, não regras que dependem do banco). */
export interface OrderInput {
  items: OrderItemInput[];
  type: OrderType;
  /** Null = conta aberta no balcão (paga no fim; decisão do usuário, 2026-10-10). */
  paymentMethodId: number | null;
  /** Meio na maquininha; null nas outras formas (a regra depende do cadastro: ver o service). */
  paymentMode: PaymentMode | null;
  /** Partes do pagamento quando dividido entre 2+ formas (card 2, 2026-11-08); vazio sem divisão. */
  paymentParts: PaymentPart[];
  /**
   * Cliente: obrigatório na entrega (o bairro vem do cadastro dele); no balcão, opcional desde o
   * fiado (2026-10-25), e aí o nome e o telefone vêm do cadastro.
   */
  customerId: number | null;
  /** Sobrescrita da taxa da zona; null usa a taxa padrão do bairro. */
  deliveryFee: string | null;
  /** Nome no balcão (obrigatório na conta aberta); null na entrega ou sem nome. */
  counterName: string | null;
  /** "Troco para" da entrega paga em dinheiro; null sem troco. */
  changeFor: string | null;
  /**
   * Código de entrega neste pedido (2026-11-21: o caixa liga ou desliga, o bairro só dá o
   * padrão). Null = segue o bairro: tela antiga em cache ou balcão.
   */
  requiresDeliveryCode: boolean | null;
  /** Opção de consumo: COMER ou VIAGEM (só no balcão; null na entrega). */
  diningOption: DiningOption | null;
  /** Previsão do pagamento do fiado (YYYY-MM-DD); null = "Sem data" (ou não é fiado). */
  fiadoDueDate: string | null;
  /** Nº do pedido no app do iFood (2026-11-23); null fora do iFood ou sem nº. */
  ifoodCode: string | null;
}

const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null;

function parseType(raw: unknown): OrderType {
  return parseChoice(raw, 'type', ORDER_TYPES);
}

type TypeFields = Pick<
  OrderInput,
  | 'customerId'
  | 'deliveryFee'
  | 'counterName'
  | 'changeFor'
  | 'diningOption'
  | 'requiresDeliveryCode'
>;

const optionalId = (raw: unknown, field: string): number | null =>
  isAbsent(raw) ? null : parseId(raw, field);

function rejectPresent(
  body: Record<string, unknown>,
  fields: string[],
  what: string,
): void {
  const present = fields.filter((field) => !isAbsent(body[field]));
  if (present.length === 0) return;
  throw new BadRequestException(
    `${what} não aceita ${present.map((f) => `"${f}"`).join(', ')}: esperado omitir`,
  );
}

/** COMER ou VIAGEM; ausente vira TAKEAWAY (telas antigas em cache). */
function parseDiningOption(raw: unknown): DiningOption {
  if (isAbsent(raw)) return 'TAKEAWAY';
  return parseChoice(raw, 'diningOption', DINING_OPTIONS);
}

const isBlank = (raw: unknown): boolean =>
  isAbsent(raw) || (typeof raw === 'string' && raw.trim() === '');

/** Nome aparado; vazio = sem nome. */
function parseCounterName(raw: unknown): string | null {
  if (isBlank(raw)) return null;
  return parseText(raw, 'counterName', MAX_COUNTER_NAME_LENGTH);
}

/** Nº do iFood aparado; vazio = sem nº. */
function parseIfoodCode(raw: unknown): string | null {
  if (isBlank(raw)) return null;
  return parseText(raw, 'ifoodCode', MAX_IFOOD_CODE_LENGTH);
}

/** Balcão: sem taxa nem troco; o cliente (fiado) é opcional e, com ele, o nome vem do cadastro. */
function parseCounterFields(body: Record<string, unknown>): TypeFields {
  rejectPresent(
    body,
    ['deliveryFee', 'changeFor', 'requiresDeliveryCode'],
    'Pedido de balcão (COUNTER)',
  );
  const customerId = optionalId(body.customerId, 'customerId');
  if (customerId !== null)
    rejectPresent(
      body,
      ['counterName'],
      'Pedido de balcão com cliente ("customerId")',
    );
  const counterName = parseCounterName(body.counterName);
  const diningOption = parseDiningOption(body.diningOption);
  return {
    customerId,
    deliveryFee: null,
    counterName,
    changeFor: null,
    diningOption,
    requiresDeliveryCode: null,
  };
}

function parseDeliveryFields(body: Record<string, unknown>): TypeFields {
  rejectPresent(body, ['counterName', 'diningOption'], 'Entrega (DELIVERY)');
  return {
    customerId: parseId(body.customerId, 'customerId'),
    deliveryFee: isAbsent(body.deliveryFee)
      ? null
      : parseMoney(body.deliveryFee, 'deliveryFee', true),
    counterName: null,
    changeFor: isAbsent(body.changeFor)
      ? null
      : parseMoney(body.changeFor, 'changeFor', false),
    diningOption: null,
    requiresDeliveryCode: isAbsent(body.requiresDeliveryCode)
      ? null
      : parseBoolean(body.requiresDeliveryCode, 'requiresDeliveryCode'),
  };
}

/**
 * Forma de pagamento: `null` explícito = conta aberta, só no balcão, com nome e sem meio da
 * maquininha. Sem o campo continua sendo erro (para o pedido não ficar aberto sem querer).
 */
function assertOpenAccount(input: OrderInput): void {
  if (input.paymentMethodId !== null) return;
  const problem = openAccountProblem(input);
  if (problem) throw new BadRequestException(`Pedido inválido: ${problem}`);
}

function openAccountProblem(input: OrderInput): string | null {
  if (input.type === 'DELIVERY')
    return 'entrega não fica aberta: esperado "paymentMethodId" de uma forma de pagamento';
  if (input.counterName === null)
    return 'pedido aberto precisa do nome: esperado "counterName" com o nome da pessoa';
  if (input.paymentMode !== null)
    return 'pedido aberto não tem meio da maquininha: esperado omitir "paymentMode"';
  return null;
}

function parseFiadoDueDate(raw: unknown): string | null {
  if (isAbsent(raw)) return null;
  return parseBusinessDate(String(raw));
}

/** Desde o pedido por item (sessão 10) o total é calculado no servidor pelo preço do cadastro. */
function rejectAmount(fields: Record<string, unknown>): void {
  if (fields.amount === undefined) return;
  throw new BadRequestException(
    `Campo "amount" não é aceito: recebido ${describeReceived(fields.amount)}, esperado omitir (o total vem dos itens: envie "items")`,
  );
}

type PaymentChoiceParsed = Pick<
  OrderInput,
  'paymentMethodId' | 'paymentMode' | 'paymentParts'
>;

/** A forma única de sempre ou, no pagamento dividido (card 2), as partes. */
function parsePaymentChoice(
  fields: Record<string, unknown>,
): PaymentChoiceParsed {
  const split = parseSplitChoice(fields, 'Pedido');
  if (split) return split;
  return {
    paymentParts: [],
    paymentMethodId:
      fields.paymentMethodId === null
        ? null
        : parseId(fields.paymentMethodId, 'paymentMethodId'),
    paymentMode: isAbsent(fields.paymentMode)
      ? null
      : parseChoice(fields.paymentMode, 'paymentMode', PAYMENT_MODES),
  };
}

/**
 * Valida o corpo de um pedido vindo da API.
 *
 * @example parseOrderInput({ items: [{ productId: 9, quantity: 2 }], type: 'COUNTER', paymentMethodId: 1 })
 */
export function parseOrderInput(body: unknown): OrderInput {
  const fields = parseObject(body, 'pedido');
  rejectAmount(fields);
  const type = parseType(fields.type);
  if (type === 'IFOOD') return parseIfoodInput(fields);
  rejectPresent(fields, ['ifoodCode'], `Pedido ${type}`);
  const payment = parsePaymentChoice(fields);
  const input: OrderInput = {
    items: parseOrderItems(fields.items),
    type,
    ...payment,
    ...(type === 'COUNTER'
      ? parseCounterFields(fields)
      : parseDeliveryFields(fields)),
    fiadoDueDate: parseFiadoDueDate(fields.fiadoDueDate),
    ifoodCode: null,
  };
  assertOpenAccount(input);
  return input;
}

/** Campos que o pedido do iFood não tem: pagamento (é sempre o do iFood), entrega e consumo. */
const NOT_IFOOD_FIELDS = [
  'paymentMethodId',
  'paymentMode',
  'paymentParts',
  'fiadoDueDate',
  'customerId',
  'deliveryFee',
  'changeFor',
  'requiresDeliveryCode',
  'diningOption',
];

/**
 * Pedido do iFood (2026-11-23): só itens, o nome do cliente do app e o nº do pedido. A forma
 * fica `null` aqui e o service troca pela do iFood (`payment_methods.is_ifood`) antes de usar:
 * null sozinho seria a conta aberta do balcão.
 *
 * @example parseIfoodInput({ type: 'IFOOD', items: [{ productId: 9, quantity: 1 }], ifoodCode: '4821' }).ifoodCode // '4821'
 */
function parseIfoodInput(fields: Record<string, unknown>): OrderInput {
  rejectPresent(fields, NOT_IFOOD_FIELDS, 'Pedido do iFood (IFOOD)');
  return {
    items: parseOrderItems(fields.items),
    type: 'IFOOD',
    paymentMethodId: null,
    paymentMode: null,
    paymentParts: [],
    customerId: null,
    deliveryFee: null,
    counterName: parseCounterName(fields.counterName),
    changeFor: null,
    requiresDeliveryCode: null,
    diningOption: null,
    fiadoDueDate: null,
    ifoodCode: parseIfoodCode(fields.ifoodCode),
  };
}
