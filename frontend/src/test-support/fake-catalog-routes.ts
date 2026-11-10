import type { HttpMethod } from '../api/api-client';
import type {
  AppSettings,
  DeliveryZone,
  ExpenseType,
  MotoboyRate,
  PaymentMethod,
} from '../api/types';
import {
  assertNameFree,
  fakePaymentFrom,
  reorderedPayments,
  withSavedPayment,
} from './fake-payments';

/** O que as rotas de cadastro e configurações leem e trocam no `FakeApiClient`. */
export interface FakeCatalogStore {
  zones: DeliveryZone[];
  expenseTypes: ExpenseType[];
  paymentMethods: PaymentMethod[];
  rates: MotoboyRate[];
  settings: AppSettings;
  takeId(): number;
}

type Body = Record<string, unknown>;

/**
 * `POST|PUT /delivery-zones` e `/expense-types` do fake, como o backend: nome repetido é 409 na
 * edição; a chave é o nome em minúsculas.
 *
 * @example fakeCatalogWrite(api, 'POST', '/delivery-zones', { neighborhood: 'Centro', fee: '4.00' })
 */
export function fakeCatalogWrite(
  store: FakeCatalogStore,
  method: string,
  path: string,
  body: Body,
): DeliveryZone | ExpenseType | undefined {
  const id = Number(path.split('/')[2]);
  if (path === '/delivery-zones' && method === 'POST')
    return addZone(store, body);
  if (path === '/expense-types' && method === 'POST')
    return addType(store, body);
  if (method !== 'PUT') return undefined;
  if (path.startsWith('/delivery-zones/')) return updateZone(store, id, body);
  if (path.startsWith('/expense-types/')) return updateType(store, id, body);
  return undefined;
}

export function fakeCatalogRoute(
  store: FakeCatalogStore,
  method: HttpMethod,
  path: string,
  key: string,
  body: Body,
): unknown {
  if (key === 'GET /payment-methods') return store.paymentMethods;
  if (key === 'GET /delivery-zones') return store.zones;
  if (key === 'GET /expense-types') return store.expenseTypes;
  const catalogWrite = fakeCatalogWrite(store, method, path, body);
  if (catalogWrite) return catalogWrite;
  // Antes do PUT por id, como no controller do backend.
  if (key === 'PUT /payment-methods/order')
    return (store.paymentMethods = reorderedPayments(
      store.paymentMethods,
      body.ids as number[],
    ));
  if (method === 'PUT' && path.startsWith('/payment-methods/'))
    return updatePayment(store, Number(path.split('/')[2]), body);
  if (key === 'POST /payment-methods') return addPayment(store, body);
  if (key === 'GET /motoboy-rates') return store.rates;
  if (key === 'POST /motoboy-rates') return saveRate(store, body);
  if (key === 'GET /settings') return store.settings;
  // Parcial como no backend: cada tela manda só o que é dela.
  if (key === 'PUT /settings')
    return (store.settings = { ...store.settings, ...body } as AppSettings);
  return undefined;
}

function addPayment(store: FakeCatalogStore, body: Body): PaymentMethod {
  const method = fakePaymentFrom(body, store.takeId());
  store.paymentMethods = withSavedPayment(store.paymentMethods, method, 'POST');
  return method;
}

function updatePayment(
  store: FakeCatalogStore,
  id: number,
  body: Body,
): PaymentMethod {
  const method = fakePaymentFrom(body, id);
  store.paymentMethods = withSavedPayment(store.paymentMethods, method, 'PUT');
  return method;
}

/** Grupo + data repetidos trocam o valor da linha (como o backend). */
function saveRate(store: FakeCatalogStore, body: Body): MotoboyRate {
  const dayGroup = body.dayGroup as MotoboyRate['dayGroup'];
  const effectiveFrom = String(body.effectiveFrom);
  const existing = store.rates.find(
    (r) => r.dayGroup === dayGroup && r.effectiveFrom === effectiveFrom,
  );
  const rate = {
    id: existing?.id ?? store.takeId(),
    dayGroup,
    amount: String(body.amount),
    effectiveFrom,
    createdById: 1,
  };
  store.rates = existing
    ? store.rates.map((r) => (r === existing ? rate : r))
    : [...store.rates, rate];
  return rate;
}

function updateZone(store: FakeCatalogStore, id: number, body: Body) {
  const neighborhood = String(body.neighborhood);
  assertNameFree(
    store.zones.filter((z) => z.id !== id).map((z) => z.neighborhood),
    neighborhood,
  );
  const zone = {
    ...store.zones.find((z) => z.id === id)!,
    neighborhood,
    neighborhoodKey: neighborhood.toLowerCase(),
    fee: String(body.fee),
    active: Boolean(body.active),
  };
  store.zones = store.zones.map((z) => (z.id === id ? zone : z));
  return zone;
}

function updateType(store: FakeCatalogStore, id: number, body: Body) {
  const name = String(body.name);
  assertNameFree(
    store.expenseTypes.filter((t) => t.id !== id).map((t) => t.name),
    name,
  );
  const type = {
    ...store.expenseTypes.find((t) => t.id === id)!,
    name,
    nameKey: name.toLowerCase(),
    active: Boolean(body.active),
  };
  store.expenseTypes = store.expenseTypes.map((t) => (t.id === id ? type : t));
  return type;
}

function addZone(store: FakeCatalogStore, body: Body): DeliveryZone {
  const neighborhood = String(body.neighborhood);
  const zone = {
    id: store.takeId(),
    neighborhood,
    neighborhoodKey: neighborhood.toLowerCase(),
    fee: String(body.fee),
    active: true,
  };
  store.zones = [...store.zones, zone];
  return zone;
}

function addType(store: FakeCatalogStore, body: Body): ExpenseType {
  const name = String(body.name);
  const type = {
    id: store.takeId(),
    name,
    nameKey: name.toLowerCase(),
    active: true,
  };
  store.expenseTypes = [...store.expenseTypes, type];
  return type;
}
