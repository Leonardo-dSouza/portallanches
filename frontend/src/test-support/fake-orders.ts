import type {
  Customer,
  DeliveryZone,
  Order,
  OrderItemInput,
  Product,
} from '../api/types';
import { fakeOrderAmount, priceFakeItems } from './fake-order-pricing';

interface FakeOrderSources {
  customers: Customer[];
  zones: DeliveryZone[];
  products: Product[];
}

/**
 * Pedido gravado como o backend devolve: preço do cadastro, taxa do bairro do cliente (ou a
 * sobrescrita) e a cópia dos dados do cliente.
 *
 * @example fakeOrderFrom({ items: [{ productId: 1, quantity: 2 }], type: 'COUNTER' }, 7, api).amount
 */
export function fakeOrderFrom(
  body: Record<string, unknown>,
  id: number,
  { customers, zones, products }: FakeOrderSources,
): Order {
  const customer = customers.find((c) => c.id === body.customerId);
  const zone = zones.find((z) => z.id === customer?.deliveryZoneId);
  const deliveryFee = String(body.deliveryFee ?? zone?.fee ?? '0.00');
  const items = priceFakeItems(products, body.items as OrderItemInput[]);
  return {
    id,
    ...body,
    items,
    amount: fakeOrderAmount(items, deliveryFee),
    deliveryZoneId: zone?.id ?? null,
    deliveryFee,
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    customerStreet: customer?.street ?? null,
    customerNumber: customer?.number ?? null,
    customerReference: customer?.reference ?? null,
  } as Order;
}
