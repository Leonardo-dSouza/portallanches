import { parseObject, parseText } from '../common/input-parsers.js';
import {
  parseOrderItems,
  type OrderItemInput,
} from '../orders/order-item-input.js';

/** Mesmo limite do nome no balcão: cabe na comanda e na lista. */
const MAX_CONSUMER_NAME_LENGTH = 40;

/** Corpo do consumo interno já validado: quem consumiu e os itens (no formato do pedido). */
export interface StaffConsumptionInput {
  consumerName: string;
  items: OrderItemInput[];
}

/**
 * Lê o consumo interno: nome livre de quem consumiu ("Bianca", "Equipe") e os itens, que aceitam
 * observação e adicionais como no pedido.
 *
 * @example parseStaffConsumptionInput({ consumerName: 'Bianca', items: [{ productId: 9, quantity: 1 }] })
 */
export function parseStaffConsumptionInput(
  body: unknown,
): StaffConsumptionInput {
  const fields = parseObject(body, 'consumo interno');
  return {
    consumerName: parseText(
      fields.consumerName,
      'consumerName',
      MAX_CONSUMER_NAME_LENGTH,
    ),
    items: parseOrderItems(fields.items),
  };
}
