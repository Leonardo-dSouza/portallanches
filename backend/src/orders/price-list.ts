import type { OrderType } from './order-input.js';
import type { SaleProduct } from './order-pricing.js';

/**
 * De onde sai o preço da linha (2026-11-23): o do cardápio (balcão e entrega) ou o do app do
 * iFood, que é maior porque cobre a comissão.
 */
export type PriceList = 'STORE' | 'IFOOD';

/**
 * A lista de preços de um tipo de pedido.
 *
 * @example priceListOf('IFOOD') // 'IFOOD'
 */
export function priceListOf(type: OrderType): PriceList {
  return type === 'IFOOD' ? 'IFOOD' : 'STORE';
}

/**
 * O produto com o preço da lista no lugar do `salePrice`. No iFood, produto sem preço iFood fica
 * sem preço e o `sellable()` do pricing recusa, como o sem preço no balcão.
 *
 * @example withPriceList({ ...xSalada, salePrice: '17.80', ifoodPrice: '24.90' }, 'IFOOD').salePrice // '24.90'
 */
export function withPriceList(
  product: SaleProduct,
  list: PriceList,
): SaleProduct {
  if (list === 'STORE') return product;
  return { ...product, salePrice: product.ifoodPrice };
}
