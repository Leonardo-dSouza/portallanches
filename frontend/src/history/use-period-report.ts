import { useCallback } from 'react';
import type { AdminApi } from '../api/admin-api';
import type { DateRange, PeriodReport } from '../api/types';
import { useRangeData } from './use-range-data';

export interface PeriodReportState {
  report: PeriodReport | null;
  error: string | null;
  /** Só é `true` quando o período mudou; `reload` mantém a tabela na tela. */
  loading: boolean;
  reload(): void;
}

/**
 * Carrega o relatório do período do Histórico, só com o dia da semana escolhido (`weekday`,
 * 0 = domingo; null = todos). `range: null` = inválido, não busca.
 *
 * @example const { report } = usePeriodReport(admin, { from: '2026-09-22', to: '2026-09-28' }, 4);
 */
export function usePeriodReport(
  admin: AdminApi,
  range: DateRange | null,
  weekday: number | null,
): PeriodReportState {
  const load = useCallback(
    (period: DateRange) => admin.periodReport(period, weekday),
    [admin, weekday],
  );
  const { data, ...state } = useRangeData(load, range, String(weekday));
  return { report: data, ...state };
}
