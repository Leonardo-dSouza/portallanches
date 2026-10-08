import type { OrderItem, OrderItemInput, Product } from '../api/types';

/**
 * Como a API: o preço vem do cadastro (`products`), nunca do corpo.
 *
 * @example priceFakeItems(MENU, [{ productId: 1, quantity: 2 }])[0].unitPrice // '17.80'
 */
export function priceFakeItems(
  products: Product[],
  items: OrderItemInput[] = [],
): OrderItem[] {
  return items.map(({ productId, quantity }) => {
    const product = products.find((p) => p.id === productId);
    return {
      productId,
      productName: product?.name ?? `#${productId}`,
      menuNumber: product?.menuNumber ?? null,
      categoryName: product?.categoryName ?? '',
      quantity,
      unitPrice: product?.salePrice ?? '0.00',
      unitCmv: null,
      cmvComplete: false,
    };
  });
}

/**
 * Soma dos itens + taxa, em centavos (o mesmo cálculo do backend).
 *
 * @example fakeOrderAmount(items, '3.00') // '38.60'
 */
export function fakeOrderAmount(items: OrderItem[], fee: string): string {
  const cents = (money: string) => Math.round(Number(money) * 100);
  const total = items.reduce(
    (sum, item) => sum + item.quantity * cents(item.unitPrice),
    cents(fee),
  );
  return (total / 100).toFixed(2);
}
