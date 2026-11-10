import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import type { StockItem, Supply } from '../api/types';
import { FakeApiClient } from './fake-api-client';
import { FakeSelectionStorage, FakeTextExport } from './fake-stock-export';
import {
  type MenuFilterStorage,
  type StockTabWithMenuFilter,
} from '../stock/menu-filter-storage';
import { StockPage } from '../pages/StockPage';

export class FakeMenuFilterStorage implements MenuFilterStorage {
  readonly saved: { tab: StockTabWithMenuFilter; soldInMenuOnly: boolean }[] =
    [];
  private readonly choices = new Map<StockTabWithMenuFilter, boolean>();

  constructor(initial?: Partial<Record<StockTabWithMenuFilter, boolean>>) {
    if (initial?.status !== undefined)
      this.choices.set('status', initial.status);
    if (initial?.count !== undefined) this.choices.set('count', initial.count);
  }

  load(tab: StockTabWithMenuFilter): boolean | null {
    return this.choices.get(tab) ?? null;
  }

  save(tab: StockTabWithMenuFilter, soldInMenuOnly: boolean): void {
    this.saved.push({ tab, soldInMenuOnly });
    this.choices.set(tab, soldInMenuOnly);
  }
}

export const NO_FLAGS = {
  expired: false,
  expiringSoon: false,
  belowMin: false,
  needsPurchase: false,
  countDue: false,
  oversold: false,
};

export const stockItem = (
  supplyId: number,
  name: string,
  overrides: Partial<StockItem> = {},
): StockItem => ({
  supplyId,
  name,
  sectionId: null,
  countUnit: 'un',
  minStock: null,
  dailyCount: false,
  soldInMenu: true,
  quantity: '10',
  lots: [],
  nextExpiry: null,
  lastCount: null,
  oversold: null,
  flags: NO_FLAGS,
  ...overrides,
});

export const supply = (
  id: number,
  name: string,
  packages: Supply['packages'] = [],
): Supply => ({
  id,
  name,
  countUnit: 'un',
  minStock: null,
  unitCost: null,
  deductOnSale: true,
  dailyCount: false,
  sectionId: null,
  saleProduct: null,
  active: true,
  packages,
});

export function fakeStockApi(): FakeApiClient {
  const api = new FakeApiClient();
  api.supplies = [
    supply(1, 'iT Laranja 2L', [{ name: 'fardo', quantity: '6' }]),
    supply(2, 'Leite condensado'),
    supply(3, 'Calabresa fatiada'),
  ];
  api.stockItems = [
    stockItem(1, 'iT Laranja 2L', {
      nextExpiry: '2026-09-26',
      flags: { ...NO_FLAGS, expiringSoon: true },
    }),
    stockItem(2, 'Leite condensado', {
      quantity: '2',
      minStock: '4',
      flags: { ...NO_FLAGS, belowMin: true },
    }),
    stockItem(3, 'Calabresa fatiada'),
  ];
  return api;
}

export async function renderStock(
  api = fakeStockApi(),
  storage = new FakeSelectionStorage(),
  textExport = new FakeTextExport(),
  menuFilterStorage = new FakeMenuFilterStorage(),
): Promise<FakeApiClient> {
  render(
    <ApiContext.Provider value={api}>
      <StockPage
        today="2026-09-25"
        selectionStorage={storage}
        textExport={textExport}
        menuFilterStorage={menuFilterStorage}
      />
    </ApiContext.Provider>,
  );
  await screen.findByRole('heading', { name: 'Estoque' });
  return api;
}

export const typeStockInput = (label: string, text: string) =>
  userEvent.type(screen.getByLabelText(label), text);
export const clickStockButton = (name: string) =>
  userEvent.click(screen.getByRole('button', { name }));
export const postedTo = (api: FakeApiClient, path: string) =>
  api.calls
    .filter((c) => c.method === 'POST' && c.path === path)
    .map((c) => c.body);

export { fakeStockApi as fakeApi, renderStock as renderStockPage };
