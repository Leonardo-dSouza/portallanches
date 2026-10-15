import type {
  Customer,
  DeliveryZone,
  Order,
  OrderItemInput,
  OrderStatus,
  Product,
  StockShortfall,
  UserRole,
} from '../api/types';
import type { HttpMethod } from '../api/api-client';
import type { OrderEvent } from '../api/order-event-types';
import { fakeCancelRoute } from './fake-order-cancel';
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
  role: UserRole;
  /** Fora da trava do caixa: cancelar pede a senha do admin (o backend decide pela hora). */
  cancelNeedsManager: boolean;
  /** Histórico de cada pedido, como o `GET /orders/:id/events` devolve. */
  orderEvents: Record<number, OrderEvent[]>;
  takeId(): number;
}

type Body = Record<string, unknown>;

const STATUS_FLOW: Record<'DELIVERY' | 'COUNTER', OrderStatus[]> = {
  DELIVERY: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  COUNTER: ['PREPARING', 'DELIVERED'],
};
const STATUS_ROUTE = /^\/orders\/(\d+)\/status\/(next|previous)$/;
const CANCEL_ROUTE = /^\/orders\/(\d+)\/(cancel|restore|events)$/;

/** Fixos do pedido: o número, a hora, o status e o cancelamento que ele já tinha. */
type OrderIdentity = Pick<
  Order,
  | 'id'
  | 'dayNumber'
  | 'createdAt'
  | 'status'
  | 'statusChangedAt'
  | 'canceledAt'
  | 'cancelReason'
>;

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
    statusChangedAt: '2026-09-22T23:41:00Z',
    canceledAt: null,
    cancelReason: null,
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
 * Rotas `/orders` do fake: lista, grava (número do dia e status como o backend), muda o status,
 * cancela, desfaz e devolve o histórico.
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
  const cancel = CANCEL_ROUTE.exec(path);
  if (cancel) return fakeCancelRoute(store, Number(cancel[1]), cancel[2], body);
  if (method === 'GET') return store.orders;
  return saveOrder(store, method, id, body);
}
