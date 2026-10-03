import type { ApiClient } from './api-client';
import type {
  StockCountItem,
  StockEntryInput,
  StockEntryRecord,
  StockItem,
} from './types';

/** Estoque: situação, entradas e contagens (caixa e admin). */
export interface StockApi {
  listStock(): Promise<StockItem[]>;
  /** Compra inteira numa transação só: ou entra tudo, ou nada. */
  addEntries(items: StockEntryInput[]): Promise<unknown>;
  /** Entradas dos últimos 30 dias, mais recentes primeiro. */
  listEntries(): Promise<StockEntryRecord[]>;
  /** Desfaz uma entrada intacta (nada mexeu no lote depois dela). */
  reverseEntry(lotId: number): Promise<void>;
  /** Contagem por sobrescrita: o saldo de cada insumo contado passa a ser o informado. */
  saveCounts(items: StockCountItem[]): Promise<void>;
}

/** @example await createStockApi(api).saveCounts([{ supplyId: 3, status: 'COUNTED', quantity: '8' }]); */
export function createStockApi(api: ApiClient): StockApi {
  return {
    listStock: () => api.request('GET', '/stock'),
    addEntries: (items) => api.request('POST', '/stock/entries', { items }),
    listEntries: () => api.request('GET', '/stock/entries'),
    reverseEntry: (lotId) =>
      api.request('POST', `/stock/entries/${lotId}/reversal`),
    saveCounts: (items) => api.request('POST', '/stock/counts', { items }),
  };
}
