import type {
  Customer,
  DeliveryZone,
  Order,
  OrderItemInput,
  OrderStatus,
  PaymentMethod,
  Product,
  StockShortfall,
  UserRole,
} from '../api/types';
import { ApiError, type HttpMethod } from '../api/api-client';
import type { OrderEvent } from '../api/order-event-types';
import { fakeCancelRoute } from './fake-order-cancel';
import { requireFakeManager } from './fake-manager';
import { fakeOrderAmount, priceFakeItems } from './fake-order-pricing';
import { savedInto } from './fake-lists';
import { fakeOrderFiado, type FakeFiadoData } from './fake-fiado';

interface FakeOrderSources {
  customers: Customer[];
  zones: DeliveryZone[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  fiado: FakeFiadoData;
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
  /** Fora da trava: editar (baixar o valor ou trocar a forma) pede a senha do admin. */
  editNeedsManager: boolean;
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
 * sobrescrita), a cópia dos dados do cliente e, no balcão, o nome digitado. O balcão com cliente
 * (fiado) copia só o nome e o telefone.
 *
 * @example fakeOrderFrom({ items: [{ productId: 1, quantity: 2 }], type: 'COUNTER' }, identity, api).amount
 */
export function fakeOrderFrom(
  body: Body,
  identity: OrderIdentity,
  sources: FakeOrderSources,
): Order {
  const customer = sources.customers.find((c) => c.id === body.customerId);
  const delivery = body.type === 'DELIVERY' ? customer : undefined;
  const zone = sources.zones.find((z) => z.id === delivery?.deliveryZoneId);
  const deliveryFee = String(body.deliveryFee ?? zone?.fee ?? '0.00');
  const items = priceFakeItems(
    sources.products,
    body.items as OrderItemInput[],
  );
  const amount = fakeOrderAmount(items, deliveryFee);
  const { counterName, ...fields } = body;
  return {
    ...identity,
    ...fields,
    paymentMode: body.paymentMode ?? null,
    changeFor: body.changeFor ?? null,
    items,
    amount,
    deliveryZoneId: zone?.id ?? null,
    deliveryFee,
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? counterName ?? null,
    customerPhone: customer?.phone ?? null,
    customerStreet: delivery?.street ?? null,
    customerNumber: delivery?.number ?? null,
    customerReference: delivery?.reference ?? null,
    fiadoDueDate: body.fiadoDueDate ?? null,
    fiado: fakeOrderFiado(body, amount, sources.paymentMethods, sources.fiado),
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
  if (method === 'PUT' && store.editNeedsManager)
    requireFakeManager(store.role, body);
  const identity = method === 'PUT' && previous ? previous : newIdentity(store);
  const order = fakeOrderFrom(body, identity, store);
  store.orders = savedInto(store.orders, order, method);
  return {
    ...order,
    stockShortfalls: store.stockShortfalls,
    live: store.liveOrders,
  };
}

/**
 * Um passo no fluxo do tipo, como o `POST /orders/:id/status/next|previous`: só a partir do
 * status que a tela mandou (`from`), senão 409 como o backend.
 */
function stepStatus(
  store: FakeOrderStore,
  id: number,
  step: string,
  body: Body,
): Order {
  const order = store.orders.find((o) => o.id === id) as Order;
  if (body.from !== order.status)
    throw new ApiError(
      409,
      `Pedido #${order.dayNumber} já está em ${order.status}, não em ${String(body.from)}`,
    );
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
  if (status) return stepStatus(store, Number(status[1]), status[2], body);
  const cancel = CANCEL_ROUTE.exec(path);
  if (cancel) return fakeCancelRoute(store, Number(cancel[1]), cancel[2], body);
  if (method === 'GET') return store.orders;
  return saveOrder(store, method, id, body);
}
