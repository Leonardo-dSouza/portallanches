import type { HttpMethod } from '../api/api-client';
import type {
  StockEntryRecord,
  StockItem,
  Supply,
  SupplyMovementsReport,
  SupplySection,
  UserRole,
} from '../api/types';
import { asSeenBy } from './fake-costs';
import { savedInto } from './fake-lists';
import { assertNameFree } from './fake-payments';

/** O que as rotas de estoque e insumos do fake leem e trocam no `FakeApiClient`. */
export interface FakeStockStore {
  stockItems: StockItem[];
  stockEntries: StockEntryRecord[];
  stockMovementsReports: Map<number, SupplyMovementsReport>;
  supplies: Supply[];
  supplySections: SupplySection[];
  role: UserRole;
  takeId(): number;
}

type Body = Record<string, unknown>;

export function fakeStockRoute(
  store: FakeStockStore,
  method: HttpMethod,
  path: string,
  body: Body,
  query: string,
): unknown {
  const key = `${method} ${path}`;
  if (key === 'GET /stock') return store.stockItems;
  if (key === 'GET /stock/entries')
    return store.stockEntries.map((entry) => asSeenBy(store.role, entry));
  if (key === 'POST /stock/entries') return body.items;
  const reversal = /^\/stock\/entries\/(\d+)\/reversal$/.exec(path);
  if (method === 'POST' && reversal)
    return reverseEntry(store, Number(reversal[1]));
  const movements = /^\/stock\/supplies\/(\d+)\/movements$/.exec(path);
  if (method === 'GET' && movements)
    return handleStockMovements(store, Number(movements[1]), query);
  if (key === 'POST /stock/counts') return undefined;
  if (key === 'GET /supplies/sections') return store.supplySections;
  if (path.startsWith('/supplies')) {
    const id = Number(path.split('/')[2]);
    return supplyRoute(store, method, id, body);
  }
  return undefined;
}

function reverseEntry(store: FakeStockStore, lotId: number): undefined {
  store.stockEntries = store.stockEntries.map((entry) =>
    entry.lotId === lotId
      ? { ...entry, reversible: false, reversedAt: '2026-09-25T23:00:00Z' }
      : entry,
  );
  return undefined;
}

function handleStockMovements(
  store: FakeStockStore,
  supplyId: number,
  query: string,
): SupplyMovementsReport {
  const report = store.stockMovementsReports.get(supplyId);
  const search = new URLSearchParams(query);
  const kind = search.get('kind');
  if (report) {
    const filtered = kind
      ? report.movements.filter((m) => m.kind === kind)
      : report.movements;
    return { ...report, movements: filtered };
  }
  const supply =
    store.supplies.find((s) => s.id === supplyId) ??
    store.stockItems.find((s) => s.supplyId === supplyId);
  return {
    supply: {
      id: supplyId,
      name: supply?.name ?? 'Insumo',
      countUnit: supply?.countUnit ?? 'un',
    },
    totals: { entered: '0', sold: '0', adjusted: '0' },
    movements: [],
  };
}

/** Insumos: lista, cadastro (nome repetido → 409) e edição, como `/supplies`. */
function supplyRoute(
  store: FakeStockStore,
  method: HttpMethod,
  id: number,
  body: Body,
): unknown {
  if (method === 'GET')
    return store.supplies.map((supply) => asSeenBy(store.role, supply));
  const others = store.supplies.filter((s) => s.id !== id);
  assertNameFree(
    others.map((s) => s.name),
    String(body.name),
  );
  const supply = {
    ...(body as unknown as Omit<Supply, 'id'>),
    id: method === 'PUT' ? id : store.takeId(),
  };
  store.supplies = savedInto(store.supplies, supply, method);
  return supply;
}
