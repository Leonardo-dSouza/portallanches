import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api/error-message';
import type { StockApi } from '../api/stock-api';
import type { SupplyApi } from '../api/supply-api';
import type { StockItem, Supply } from '../api/types';

export interface StockData {
  items: StockItem[];
  /** Insumos ativos com as embalagens (para converter entradas). */
  supplies: Supply[];
}

export interface StockDataState {
  data: StockData | null;
  error: string | null;
  reload(): void;
}

/**
 * Situação do estoque e cadastro de insumos numa carga só; `reload` depois de cada gravação.
 *
 * @example const { data, reload } = useStockData(stockApi, supplyApi);
 */
export function useStockData(
  stock: StockApi,
  supplies: SupplyApi,
): StockDataState {
  const [state, setState] = useState<Omit<StockDataState, 'reload'>>({
    data: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    Promise.all([stock.listStock(), supplies.listSupplies()]).then(
      ([items, all]) =>
        current &&
        setState({
          data: { items, supplies: all.filter((s) => s.active) },
          error: null,
        }),
      (failure) =>
        current && setState({ data: null, error: errorMessage(failure) }),
    );
    return () => {
      current = false;
    };
  }, [stock, supplies, attempt]);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
