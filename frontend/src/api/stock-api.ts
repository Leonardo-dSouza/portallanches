import type { ApiClient } from './api-client';
import type { StockCountItem, StockEntryInput, StockItem } from './types';

/** Estoque: situação, entradas e contagens (caixa e admin). */
export interface StockApi {
  listStock(): Promise<StockItem[]>;
  addEntry(input: StockEntryInput): Promise<unknown>;
  /** Contagem por sobrescrita: o saldo de cada insumo contado passa a ser o informado. */
  saveCounts(items: StockCountItem[]): Promise<void>;
}

/** @example await createStockApi(api).saveCounts([{ supplyId: 3, status: 'COUNTED', quantity: '8' }]); */
export function createStockApi(api: ApiClient): StockApi {
  return {
    listStock: () => api.request('GET', '/stock'),
    addEntry: (input) => api.request('POST', '/stock/entries', input),
    saveCounts: (items) => api.request('POST', '/stock/counts', { items }),
  };
}
