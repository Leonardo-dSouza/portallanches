import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api/error-message';
import type { StockApi } from '../api/stock-api';
import type { StockEntryRecord } from '../api/types';

export interface EntryHistoryState {
  entries: StockEntryRecord[] | null;
  error: string | null;
  /** Lote com estorno em andamento (botão ocupado). */
  reversing: number | null;
  reverse(lotId: number): Promise<void>;
}

/**
 * Entradas recentes; recarrega quando `version` muda (nova compra lançada) e depois de
 * cada estorno, avisando a página para recalcular os saldos.
 *
 * @example const history = useEntryHistory(stock, version, onSaved);
 */
export function useEntryHistory(
  stock: StockApi,
  version: number,
  onChanged: () => void,
): EntryHistoryState {
  const [entries, setEntries] = useState<StockEntryRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reversing, setReversing] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    stock.listEntries().then(
      (loaded) => current && setEntries(loaded),
      (failure) => current && setError(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [stock, version, attempt]);
  const reverse = useCallback(
    async (lotId: number) => {
      setReversing(lotId);
      try {
        await stock.reverseEntry(lotId);
        setError(null);
        setAttempt((n) => n + 1);
        onChanged();
      } catch (failure) {
        setError(errorMessage(failure));
      } finally {
        setReversing(null);
      }
    },
    [stock, onChanged],
  );
  return { entries, error, reversing, reverse };
}
