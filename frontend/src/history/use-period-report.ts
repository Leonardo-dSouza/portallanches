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
 * Carrega o relatório do período do Histórico. `range: null` = inválido, não busca.
 *
 * @example const { report } = usePeriodReport(admin, { from: '2026-09-22', to: '2026-09-28' });
 */
export function usePeriodReport(
  admin: AdminApi,
  range: DateRange | null,
): PeriodReportState {
  const { data, ...state } = useRangeData(admin.periodReport, range);
  return { report: data, ...state };
}
