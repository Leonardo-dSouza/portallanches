import type { OrderItemInput } from '../api/types';
import { mergeIdenticalLines } from './line-merge';
import type { DraftLine } from './order-lines';

/** A comanda (pedido ou consumo) sem nenhuma linha não salva: o que dizer ao caixa. */
export const NO_ITEMS_ERROR =
  'Lance pelo menos um item: o número do lanche (9, 9. artesanal) ou parte do nome';

function toItemInput(line: DraftLine): OrderItemInput {
  const { productId, quantity, note } = line;
  const addons = line.addons.map((a) => ({
    productId: a.productId,
    quantity: a.quantity,
  }));
  return {
    productId,
    quantity,
    ...(note && { note }),
    ...(addons.length > 0 && { addons }),
  };
}

/**
 * Itens do corpo do pedido (e do consumo interno): só as linhas idênticas se juntam, e cada
 * uma vai com o produto, a quantidade, a observação e os adicionais (o preço vem da API).
 *
 * @example itemsRequestOf(lines) // [{ productId: 1, quantity: 2 }]
 */
export function itemsRequestOf(lines: DraftLine[]): OrderItemInput[] {
  return mergeIdenticalLines(lines).map(toItemInput);
}
