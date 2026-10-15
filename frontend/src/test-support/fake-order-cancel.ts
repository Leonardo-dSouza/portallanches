import type { Order } from '../api/types';
import { savedInto } from './fake-lists';
import type { FakeOrderStore } from './fake-orders';
import { requireFakeManager } from './fake-manager';

/** Instante fixo do cancelamento no fake. */
const CANCELED_AT = '2026-09-22T23:50:00Z';

function changed(store: FakeOrderStore, id: number, fields: Partial<Order>) {
  const order = {
    ...(store.orders.find((o) => o.id === id) as Order),
    ...fields,
  };
  store.orders = savedInto(store.orders, order, 'PUT');
  return order;
}

/**
 * `POST /orders/:id/cancel|restore` e `GET /orders/:id/events` como o backend: fora da trava
 * (`cancelNeedsManager`), o caixa precisa da senha do admin.
 *
 * @example fakeCancelRoute(api, 7, 'cancel', { reason: 'Cliente desistiu' })
 */
export function fakeCancelRoute(
  store: FakeOrderStore,
  id: number,
  action: string,
  body: Record<string, unknown>,
): unknown {
  if (action === 'events') return store.orderEvents[id] ?? [];
  if (action === 'restore')
    return changed(store, id, { canceledAt: null, cancelReason: null });
  if (store.cancelNeedsManager) requireFakeManager(store.role, body);
  return changed(store, id, {
    canceledAt: CANCELED_AT,
    cancelReason: String(body.reason),
  });
}
