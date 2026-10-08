import { BadRequestException } from '@nestjs/common';
import { parseChoice, parseId, parseObject } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';

export type OrderType = 'DELIVERY' | 'COUNTER';

/** Meio usado na maquininha; só existe quando a forma de pagamento é maquininha. */
export type PaymentMode = 'CREDIT' | 'DEBIT' | 'PIX';
const PAYMENT_MODES: readonly PaymentMode[] = ['CREDIT', 'DEBIT', 'PIX'];

/** Uma linha pedida: o preço não vem do cliente (o caixa não mexe em preço). */
export interface OrderItemInput {
  productId: number;
  quantity: number;
}

const MAX_ORDER_LINES = 50;
const MAX_LINE_QUANTITY = 99;

/** Corpo de pedido já validado (formato, não regras que dependem do banco). */
export interface OrderInput {
  items: OrderItemInput[];
  type: OrderType;
  paymentMethodId: number;
  /** Meio na maquininha; null nas outras formas (a regra depende do cadastro: ver o service). */
  paymentMode: PaymentMode | null;
  /** Cliente da entrega (o bairro vem do cadastro dele); null no balcão. */
  customerId: number | null;
  /** Sobrescrita da taxa da zona; null usa a taxa padrão do bairro. */
  deliveryFee: string | null;
}

const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null;

function parseType(raw: unknown): OrderType {
  if (raw === 'DELIVERY' || raw === 'COUNTER') return raw;
  throw new BadRequestException(
    `Campo "type" inválido: recebido ${JSON.stringify(raw)}, esperado "DELIVERY" ou "COUNTER"`,
  );
}

function parseCounterFields(body: Record<string, unknown>): void {
  if (isAbsent(body.customerId) && isAbsent(body.deliveryFee)) return;
  throw new BadRequestException(
    'Pedido de balcão (COUNTER) não aceita "customerId" nem "deliveryFee": esperado omitir os dois',
  );
}

function parseDeliveryFields(
  body: Record<string, unknown>,
): Pick<OrderInput, 'customerId' | 'deliveryFee'> {
  return {
    customerId: parseId(body.customerId, 'customerId'),
    deliveryFee: isAbsent(body.deliveryFee)
      ? null
      : parseMoney(body.deliveryFee, 'deliveryFee', true),
  };
}

function parseQuantity(raw: unknown, field: string): number {
  const ok = typeof raw === 'number' && Number.isInteger(raw);
  if (ok && raw >= 1 && raw <= MAX_LINE_QUANTITY) return raw;
  throw new BadRequestException(
    `Campo "${field}" inválido: recebido ${JSON.stringify(raw)}, esperado inteiro de 1 a ${MAX_LINE_QUANTITY}`,
  );
}

function parseItem(raw: unknown, index: number): OrderItemInput {
  const where = `items[${index}]`;
  const fields = parseObject(raw, where);
  return {
    productId: parseId(fields.productId, `${where}.productId`),
    quantity: parseQuantity(fields.quantity, `${where}.quantity`),
  };
}

/** O mesmo produto em duas linhas é recusado: a tela soma a quantidade numa linha só. */
function assertDistinctProducts(items: OrderItemInput[]): void {
  const ids = items.map((item) => item.productId);
  const repeated = ids.find((id, i) => ids.indexOf(id) !== i);
  if (repeated === undefined) return;
  throw new BadRequestException(
    `Campo "items" inválido: produto ${repeated} repetido, esperado uma linha por produto`,
  );
}

function parseItems(raw: unknown): OrderItemInput[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_ORDER_LINES)
    throw new BadRequestException(
      `Campo "items" inválido: recebido ${JSON.stringify(raw)}, esperado lista de 1 a ${MAX_ORDER_LINES} linhas { productId, quantity }`,
    );
  const items = raw.map(parseItem);
  assertDistinctProducts(items);
  return items;
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
  const common = {
    items: parseItems(fields.items),
    paymentMethodId: parseId(fields.paymentMethodId, 'paymentMethodId'),
    paymentMode: isAbsent(fields.paymentMode)
      ? null
      : parseChoice(fields.paymentMode, 'paymentMode', PAYMENT_MODES),
  };
  if (type === 'COUNTER') {
    parseCounterFields(fields);
    return { ...common, type, customerId: null, deliveryFee: null };
  }
  return { ...common, type, ...parseDeliveryFields(fields) };
}
