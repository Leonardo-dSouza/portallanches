import type {
  Customer,
  DeliveryZone,
  Order,
  OrderItemInput,
  OrderStatus,
  Product,
  StockShortfall,
} from '../api/types';
import type { HttpMethod } from '../api/api-client';
import { fakeOrderAmount, priceFakeItems } from './fake-order-pricing';
import { savedInto } from './fake-lists';

interface FakeOrderSources {
  customers: Customer[];
  zones: DeliveryZone[];
  products: Product[];
}

/** O que as rotas de pedido do fake leem e mudam no `FakeApiClient`. */
export interface FakeOrderStore extends FakeOrderSources {
  orders: Order[];
  stockShortfalls: StockShortfall[];
  /** Noite em andamento (o caixa imprime); false = caixa atrasado. */
  liveOrders: boolean;
  takeId(): number;
}

type Body = Record<string, unknown>;

const STATUS_FLOW: Record<'DELIVERY' | 'COUNTER', OrderStatus[]> = {
  DELIVERY: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  COUNTER: ['PREPARING', 'DELIVERED'],
};
const STATUS_ROUTE = /^\/orders\/(\d+)\/status\/(next|previous)$/;

/** Fixos do pedido: o número, a hora e o status que ele já tinha (ou os de um novo). */
interface OrderIdentity {
  id: number;
  dayNumber: number;
  createdAt: string;
  status: OrderStatus;
}

/**
 * Pedido gravado como o backend devolve: preço do cadastro, taxa do bairro do cliente (ou a
 * sobrescrita), a cópia dos dados do cliente e, no balcão, o nome digitado.
 *
 * @example fakeOrderFrom({ items: [{ productId: 1, quantity: 2 }], type: 'COUNTER' }, identity, api).amount
 */
export function fakeOrderFrom(
  body: Body,
  identity: OrderIdentity,
  { customers, zones, products }: FakeOrderSources,
): Order {
  const customer = customers.find((c) => c.id === body.customerId);
  const zone = zones.find((z) => z.id === customer?.deliveryZoneId);
  const deliveryFee = String(body.deliveryFee ?? zone?.fee ?? '0.00');
  const items = priceFakeItems(products, body.items as OrderItemInput[]);
  const { counterName, ...fields } = body;
  return {
    ...identity,
    ...fields,
    paymentMode: body.paymentMode ?? null,
    changeFor: body.changeFor ?? null,
    items,
    amount: fakeOrderAmount(items, deliveryFee),
    deliveryZoneId: zone?.id ?? null,
    deliveryFee,
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? counterName ?? null,
    customerPhone: customer?.phone ?? null,
    customerStreet: customer?.street ?? null,
    customerNumber: customer?.number ?? null,
    customerReference: customer?.reference ?? null,
  } as Order;
}

function newIdentity(store: FakeOrderStore): OrderIdentity {
  const last = Math.max(0, ...store.orders.map((o) => o.dayNumber));
  return {
    id: store.takeId(),
    dayNumber: last + 1,
    createdAt: '2026-09-22T23:41:00Z',
    status: store.liveOrders ? 'PREPARING' : 'DELIVERED',
  };
}

function saveOrder(
  store: FakeOrderStore,
  method: HttpMethod,
  id: number,
  body: Body,
) {
  const previous = store.orders.find((o) => o.id === id);
  const identity = method === 'PUT' && previous ? previous : newIdentity(store);
  const order = fakeOrderFrom(body, identity, store);
  store.orders = savedInto(store.orders, order, method);
  return {
    ...order,
    stockShortfalls: store.stockShortfalls,
    live: store.liveOrders,
  };
}

/** Um passo no fluxo do tipo, como o `POST /orders/:id/status/next|previous`. */
function stepStatus(store: FakeOrderStore, id: number, step: string): Order {
  const order = store.orders.find((o) => o.id === id) as Order;
  const flow = STATUS_FLOW[order.type ?? 'COUNTER'];
  const next = flow[flow.indexOf(order.status) + (step === 'next' ? 1 : -1)];
  const changed = { ...order, status: next ?? order.status };
  store.orders = savedInto(store.orders, changed, 'PUT');
  return changed;
}

/**
 * Rotas `/orders` do fake: lista, grava (número do dia e status como o backend), apaga e
 * muda o status.
 *
 * @example fakeOrderRoute(api, 'POST', '/orders', 0, body)
 */
export function fakeOrderRoute(
  store: FakeOrderStore,
  method: HttpMethod,
  path: string,
  id: number,
  body: Body,
): unknown {
  const status = STATUS_ROUTE.exec(path);
  if (status) return stepStatus(store, Number(status[1]), status[2]);
  if (method === 'GET') return store.orders;
  if (method === 'DELETE') {
    store.orders = store.orders.filter((o) => o.id !== id);
    return undefined;
  }
  return saveOrder(store, method, id, body);
}
