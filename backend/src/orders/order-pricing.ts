import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { formatCents, toCents } from '../common/money.js';
import { computeCmv, type CostedComponent } from '../products/cmv.js';
import type { OrderItemInput } from './order-input.js';

/** Produto do cardápio como o pedido precisa: preço de hoje e composição para o CMV. */
export interface SaleProduct {
  id: number;
  name: string;
  menuNumber: number | null;
  categoryName: string;
  /** Nulo = sem preço: não pode ser vendido. */
  salePrice: string | null;
  active: boolean;
  /** Vazio = produto sem composição (ex.: açaí): CMV desconhecido. */
  components: CostedComponent[];
}

/** Linha gravada no pedido: cópias e valores da época do lançamento. */
export interface OrderLine {
  productId: number;
  productName: string;
  menuNumber: number | null;
  categoryName: string;
  quantity: number;
  unitPrice: string;
  /** Nulo = produto sem composição. */
  unitCmv: string | null;
  /** Falso = faltou custo de algum insumo (ou não há composição). */
  cmvComplete: boolean;
}

function sellable(product: SaleProduct | undefined, id: number): SaleProduct {
  if (!product)
    throw new BadRequestException(
      `Produto ${id} inexistente: esperado id de um item do cardápio em products`,
    );
  if (product.active && product.salePrice !== null) return product;
  const why = product.active ? 'sem preço' : 'inativo';
  throw new UnprocessableEntityException(
    `"${product.name}" está ${why} no Cardápio: esperado item ativo e com preço de venda`,
  );
}

function newLine(product: SaleProduct, quantity: number): OrderLine {
  const hasComposition = product.components.length > 0;
  const cmv = hasComposition ? computeCmv(product.components) : null;
  return {
    productId: product.id,
    productName: product.name,
    menuNumber: product.menuNumber,
    categoryName: product.categoryName,
    quantity,
    unitPrice: product.salePrice ?? '0.00',
    unitCmv: cmv?.cmv ?? null,
    cmvComplete: cmv?.complete ?? false,
  };
}

/**
 * Linhas do pedido com o preço do cadastro. Na edição, a linha que já existia guarda o preço e o
 * CMV da época (só a quantidade muda), mesmo que o item tenha mudado de preço ou saído do
 * cardápio; linha nova pega o preço de hoje e precisa de item ativo com preço.
 *
 * @example priceOrderLines([{ productId: 9, quantity: 2 }], productsById, [])[0].unitPrice // '17.80'
 */
export function priceOrderLines(
  items: OrderItemInput[],
  products: Map<number, SaleProduct>,
  previous: OrderLine[],
): OrderLine[] {
  return items.map(({ productId, quantity }) => {
    const kept = previous.find((line) => line.productId === productId);
    if (kept) return { ...kept, quantity };
    return newLine(sellable(products.get(productId), productId), quantity);
  });
}

/**
 * Valor do pedido = soma dos itens + taxa de entrega (o que o cliente pagou; é o que bate com o
 * PIX e o dinheiro do caixa). Em centavos inteiros, sem float.
 *
 * @example orderAmount(lines, '4.50') // '64.90'
 */
export function orderAmount(lines: OrderLine[], deliveryFee: string): string {
  const items = lines.reduce(
    (sum, line) => sum + line.quantity * toCents(line.unitPrice),
    0,
  );
  return formatCents(items + toCents(deliveryFee));
}
