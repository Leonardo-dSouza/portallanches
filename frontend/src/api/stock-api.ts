import type { ApiClient } from './api-client';
import type {
  StockCountItem,
  StockEntryInput,
  StockEntryRecord,
  StockItem,
  StockMovementKind,
  SupplyMovementsReport,
} from './types';

export interface StockMovementsQuery {
  from?: string;
  to?: string;
  kind?: StockMovementKind;
}

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
  /** Movimentações de um insumo com saldo acumulado e filtros. */
  getMovements(
    supplyId: number,
    query?: StockMovementsQuery,
  ): Promise<SupplyMovementsReport>;
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
    getMovements: (supplyId, query) => {
      const search = new URLSearchParams();
      if (query?.from) search.set('from', query.from);
      if (query?.to) search.set('to', query.to);
      if (query?.kind) search.set('kind', query.kind);
      const qs = search.toString();
      return api.request(
        'GET',
        `/stock/supplies/${supplyId}/movements${qs ? `?${qs}` : ''}`,
      );
    },
  };
}
