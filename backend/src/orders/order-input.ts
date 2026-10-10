import { BadRequestException } from '@nestjs/common';
import { parseChoice, parseId, parseObject } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import { parseOrderItems, type OrderItemInput } from './order-item-input.js';

export type OrderType = 'DELIVERY' | 'COUNTER';

/** Meio usado na maquininha; só existe quando a forma de pagamento é maquininha. */
export type PaymentMode = 'CREDIT' | 'DEBIT' | 'PIX';
const PAYMENT_MODES: readonly PaymentMode[] = ['CREDIT', 'DEBIT', 'PIX'];

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
    items: parseOrderItems(fields.items),
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
