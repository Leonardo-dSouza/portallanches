import { BadRequestException } from '@nestjs/common';
import {
  parseChoice,
  parseId,
  parseObject,
  parseText,
} from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import { parseOrderItems, type OrderItemInput } from './order-item-input.js';

export type OrderType = 'DELIVERY' | 'COUNTER';

/** Meio usado na maquininha; só existe quando a forma de pagamento é maquininha. */
export type PaymentMode = 'CREDIT' | 'DEBIT' | 'PIX';
const PAYMENT_MODES: readonly PaymentMode[] = ['CREDIT', 'DEBIT', 'PIX'];

/** Nome no balcão: o caixa chama a pessoa por ele (conta aberta ou "pedido pelo nome"). */
const MAX_COUNTER_NAME_LENGTH = 40;

/** Corpo de pedido já validado (formato, não regras que dependem do banco). */
export interface OrderInput {
  items: OrderItemInput[];
  type: OrderType;
  /** Null = conta aberta no balcão (paga no fim; decisão do usuário, 2026-10-10). */
  paymentMethodId: number | null;
  /** Meio na maquininha; null nas outras formas (a regra depende do cadastro: ver o service). */
  paymentMode: PaymentMode | null;
  /** Cliente da entrega (o bairro vem do cadastro dele); null no balcão. */
  customerId: number | null;
  /** Sobrescrita da taxa da zona; null usa a taxa padrão do bairro. */
  deliveryFee: string | null;
  /** Nome no balcão (obrigatório na conta aberta); null na entrega ou sem nome. */
  counterName: string | null;
  /** "Troco para" da entrega paga em dinheiro; null sem troco. */
  changeFor: string | null;
}

const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null;

function parseType(raw: unknown): OrderType {
  if (raw === 'DELIVERY' || raw === 'COUNTER') return raw;
  throw new BadRequestException(
    `Campo "type" inválido: recebido ${JSON.stringify(raw)}, esperado "DELIVERY" ou "COUNTER"`,
  );
}

type TypeFields = Pick<
  OrderInput,
  'customerId' | 'deliveryFee' | 'counterName' | 'changeFor'
>;

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

/** Nome aparado; vazio = sem nome. */
function parseCounterName(raw: unknown): string | null {
  if (isAbsent(raw) || (typeof raw === 'string' && raw.trim() === ''))
    return null;
  return parseText(raw, 'counterName', MAX_COUNTER_NAME_LENGTH);
}

function parseCounterFields(body: Record<string, unknown>): TypeFields {
  rejectPresent(
    body,
    ['customerId', 'deliveryFee', 'changeFor'],
    'Pedido de balcão (COUNTER)',
  );
  const counterName = parseCounterName(body.counterName);
  return { customerId: null, deliveryFee: null, counterName, changeFor: null };
}

function parseDeliveryFields(body: Record<string, unknown>): TypeFields {
  rejectPresent(body, ['counterName'], 'Entrega (DELIVERY)');
  return {
    customerId: parseId(body.customerId, 'customerId'),
    deliveryFee: isAbsent(body.deliveryFee)
      ? null
      : parseMoney(body.deliveryFee, 'deliveryFee', true),
    counterName: null,
    changeFor: isAbsent(body.changeFor)
      ? null
      : parseMoney(body.changeFor, 'changeFor', false),
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

/** Desde o pedido por item (sessão 10) o total é calculado no servidor pelo preço do cadastro. */
function rejectAmount(fields: Record<string, unknown>): void {
  if (fields.amount === undefined) return;
  throw new BadRequestException(
    `Campo "amount" não é aceito: recebido ${JSON.stringify(fields.amount)}, esperado omitir (o total vem dos itens: envie "items")`,
  );
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
  const input: OrderInput = {
    items: parseOrderItems(fields.items),
    type,
    paymentMethodId:
      fields.paymentMethodId === null
        ? null
        : parseId(fields.paymentMethodId, 'paymentMethodId'),
    paymentMode: isAbsent(fields.paymentMode)
      ? null
      : parseChoice(fields.paymentMode, 'paymentMode', PAYMENT_MODES),
    ...(type === 'COUNTER'
      ? parseCounterFields(fields)
      : parseDeliveryFields(fields)),
  };
  assertOpenAccount(input);
  return input;
}
