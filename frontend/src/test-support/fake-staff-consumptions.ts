import type { HttpMethod } from '../api/api-client';
import type { OrderItem } from '../api/order-types';
import type {
  SavedStaffConsumption,
  StaffConsumption,
  StaffConsumptionInput,
} from '../api/staff-consumption-types';
import type { Product, StockShortfall } from '../api/types';
import { savedInto } from './fake-lists';
import { priceFakeItems } from './fake-order-pricing';

/** O que a rota do consumo interno lê e troca no `FakeApiClient`. */
export interface FakeStaffConsumptionStore {
  products: Product[];
  staffConsumptions: StaffConsumption[];
  consumerNames: string[];
  stockShortfalls: StockShortfall[];
  /** Noite em andamento: o caixa imprime (como no pedido). */
  liveOrders: boolean;
  takeId(): number;
}

/** Hora fixa dos lançamentos do fake (20h30 de 22/09 em Brasília). */
export const CONSUMED_AT = '2026-09-22T23:30:00.000Z';

const cents = (money: string) => Math.round(Number(money) * 100);

/** CMV pelo `cmv` do cadastro; produto sem composição (açaí) conta como sem custo. */
function fakeCost(products: Product[], items: OrderItem[]) {
  const cmvOf = (id: number) => {
    const product = products.find((p) => p.id === id);
    return product?.components.length ? product.cmv : null;
  };
  const lines = items.flatMap((item) => [item, ...item.addons]);
  const total = lines.reduce(
    (sum, line) => sum + line.quantity * cents(cmvOf(line.productId) ?? '0'),
    0,
  );
  const missing = items.filter((item) =>
    [item, ...item.addons].some((line) => cmvOf(line.productId) === null),
  );
  return {
    cmvTotal: (total / 100).toFixed(2),
    missingCostCount: missing.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function savedConsumption(
  store: FakeStaffConsumptionStore,
  method: HttpMethod,
  id: number,
  input: StaffConsumptionInput,
): SavedStaffConsumption {
  const items = priceFakeItems(store.products, input.items);
  const consumption = {
    id: method === 'PUT' ? id : store.takeId(),
    closingId: 10,
    createdById: 2,
    createdAt: CONSUMED_AT,
    consumerName: input.consumerName.trim(),
    items,
    ...fakeCost(store.products, items),
  };
  store.staffConsumptions = savedInto(
    store.staffConsumptions,
    consumption,
    method,
  );
  return {
    ...consumption,
    stockShortfalls: store.stockShortfalls,
    live: store.liveOrders,
  };
}

/**
 * `/staff-consumptions` do fake, como o backend: lista do dia, nomes, grava com o preço do
 * cadastro e apaga.
 *
 * @example fakeStaffConsumptionRoute(api, 'POST', '/staff-consumptions', NaN, { consumerName: 'Bianca', items })
 */
export function fakeStaffConsumptionRoute(
  store: FakeStaffConsumptionStore,
  method: HttpMethod,
  path: string,
  id: number,
  body: Record<string, unknown>,
): unknown {
  if (path === '/staff-consumptions/names') return store.consumerNames;
  if (method === 'GET') return store.staffConsumptions;
  if (method === 'DELETE') {
    store.staffConsumptions = store.staffConsumptions.filter(
      (c) => c.id !== id,
    );
    return undefined;
  }
  return savedConsumption(
    store,
    method,
    id,
    body as unknown as StaffConsumptionInput,
  );
}
