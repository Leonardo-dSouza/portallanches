import { useEffect, useState } from 'react';
import { errorMessage } from '../api/error-message';
import type { StockApi } from '../api/stock-api';
import type {
  DateRange,
  StockMovementKind,
  SupplyMovementsReport,
} from '../api/types';
import { addDays, parseDateKey, toDateKey } from '../history/date-keys';

const DEFAULT_DAYS = 30;

function initialRange(today: string): DateRange {
  const parsed = parseDateKey(today) ?? new Date();
  return {
    from: toDateKey(addDays(parsed, -DEFAULT_DAYS)),
    to: today,
  };
}

export interface SupplyMovementsState {
  range: DateRange;
  setRange(range: DateRange): void;
  kind: StockMovementKind | '';
  setKind(kind: StockMovementKind | ''): void;
  report: SupplyMovementsReport | null;
  loading: boolean;
  error: string | null;
}

/**
 * Consulta de movimentações de um insumo com filtros de período e tipo.
 *
 * @example const state = useSupplyMovements(stock, 3, '2026-11-05');
 */
export function useSupplyMovements(
  stock: StockApi,
  supplyId: number,
  today: string,
): SupplyMovementsState {
  const [range, setRange] = useState<DateRange>(() => initialRange(today));
  const [kind, setKind] = useState<StockMovementKind | ''>('');
  const [report, setReport] = useState<SupplyMovementsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    stock
      .getMovements(supplyId, {
        from: range.from,
        to: range.to,
        kind: kind || undefined,
      })
      .then(
        (data) => {
          if (!current) return;
          setReport(data);
          setError(null);
        },
        (failure) => {
          if (!current) return;
          setError(errorMessage(failure));
        },
      );
    return () => {
      current = false;
    };
  }, [stock, supplyId, range.from, range.to, kind]);

  return {
    range,
    setRange,
    kind,
    setKind,
    report,
    loading: report === null && error === null,
    error,
  };
}
