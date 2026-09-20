import { BadRequestException } from '@nestjs/common';
import { parseId, parseObject } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';

export type OrderType = 'DELIVERY' | 'COUNTER';

/** Corpo de pedido já validado (formato, não regras que dependem do banco). */
export interface OrderInput {
  amount: string;
  type: OrderType;
  paymentMethodId: number;
  deliveryZoneId: number | null;
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
  if (isAbsent(body.deliveryZoneId) && isAbsent(body.deliveryFee)) return;
  throw new BadRequestException(
    'Pedido de balcão (COUNTER) não aceita "deliveryZoneId" nem "deliveryFee": esperado omitir os dois',
  );
}

function parseDeliveryFields(
  body: Record<string, unknown>,
): Pick<OrderInput, 'deliveryZoneId' | 'deliveryFee'> {
  return {
    deliveryZoneId: parseId(body.deliveryZoneId, 'deliveryZoneId'),
    deliveryFee: isAbsent(body.deliveryFee)
      ? null
      : parseMoney(body.deliveryFee, 'deliveryFee', true),
  };
}

/**
 * Valida o corpo de um pedido vindo da API.
 *
 * @example parseOrderInput({ amount: 30, type: 'COUNTER', paymentMethodId: 1 })
 */
export function parseOrderInput(body: unknown): OrderInput {
  const fields = parseObject(body, 'pedido');
  const type = parseType(fields.type);
  const common = {
    amount: parseMoney(fields.amount, 'amount', false),
    paymentMethodId: parseId(fields.paymentMethodId, 'paymentMethodId'),
  };
  if (type === 'COUNTER') {
    parseCounterFields(fields);
    return { ...common, type, deliveryZoneId: null, deliveryFee: null };
  }
  return { ...common, type, ...parseDeliveryFields(fields) };
}
