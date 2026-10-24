import type { DeliveryZone, ExpenseType } from '../api/types';
import { assertNameFree } from './fake-payments';

/** O que as rotas de bairro e tipo de gasto do fake leem e trocam no `FakeApiClient`. */
export interface FakeCatalogStore {
  zones: DeliveryZone[];
  expenseTypes: ExpenseType[];
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
