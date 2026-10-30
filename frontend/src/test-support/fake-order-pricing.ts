import type {
  OrderItem,
  OrderItemInput,
  OrderItemLine,
  OrderRemoval,
  Product,
} from '../api/types';

/** Uma linha com o preço do cadastro (`products`), nunca do corpo. */
function pricedLine(
  products: Product[],
  productId: number,
  quantity: number,
): OrderItemLine {
  const product = products.find((p) => p.id === productId);
  return {
    productId,
    productName: product?.name ?? `#${productId}`,
    menuNumber: product?.menuNumber ?? null,
    categoryName: product?.categoryName ?? '',
    quantity,
    unitPrice: product?.salePrice ?? '0.00',
  };
}

/** As retiradas com o nome do insumo, como o backend devolve. */
function fakeRemovals(
  products: Product[],
  item: OrderItemInput,
): OrderRemoval[] {
  const components =
    products.find((p) => p.id === item.productId)?.components ?? [];
  return (item.removedSupplyIds ?? []).map((supplyId) => ({
    supplyId,
    supplyName:
      components.find((c) => c.supplyId === supplyId)?.supplyName ?? '',
  }));
}

/**
 * Como a API: o preço vem do cadastro, e o adicional vem por unidade e volta com o total
 * (por unidade × a quantidade do item).
 *
 * @example priceFakeItems(MENU, [{ productId: 1, quantity: 2 }])[0].unitPrice // '17.80'
 */
export function priceFakeItems(
  products: Product[],
  items: OrderItemInput[] = [],
): OrderItem[] {
  return items.map((item) => ({
    ...pricedLine(products, item.productId, item.quantity),
    note: item.note ?? null,
    addons: (item.addons ?? []).map((addon) =>
      pricedLine(products, addon.productId, addon.quantity * item.quantity),
    ),
    removals: fakeRemovals(products, item),
  }));
}

/**
 * Soma dos itens e dos adicionais + taxa, em centavos (o mesmo cálculo do backend).
 *
 * @example fakeOrderAmount(items, '3.00') // '38.60'
 */
export function fakeOrderAmount(items: OrderItem[], fee: string): string {
  const cents = (money: string) => Math.round(Number(money) * 100);
  const lines = items.flatMap((item) => [item, ...item.addons]);
  const total = lines.reduce(
    (sum, line) => sum + line.quantity * cents(line.unitPrice),
    cents(fee),
  );
  return (total / 100).toFixed(2);
}
