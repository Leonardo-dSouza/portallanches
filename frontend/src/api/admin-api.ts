import type { ApiClient } from './api-client';
import type { Closing, DateRange, PeriodReport } from './types';

/**
 * Chamadas por data de fechamento: histórico e fechar qualquer dia (só admin) e reabrir
 * (admin qualquer dia; caixa só o último dia com fechamento, regra da API).
 */
export interface AdminApi {
  /** `weekday` (0 = domingo) limita o período àquele dia da semana, inclusive nos totais. */
  periodReport(
    range: DateRange,
    weekday?: number | null,
  ): Promise<PeriodReport>;
  reopenDay(date: string): Promise<Closing>;
  closeDay(date: string): Promise<Closing>;
}

/** @example const admin = createAdminApi(api); await admin.reopenDay('2026-09-22'); */
export function createAdminApi(api: ApiClient): AdminApi {
  return {
    periodReport: ({ from, to }, weekday = null) =>
      api.request(
        'GET',
        `/reports?from=${from}&to=${to}${weekday === null ? '' : `&weekday=${weekday}`}`,
      ),
    reopenDay: (date) => api.request('POST', `/closings/${date}/reopen`),
    closeDay: (date) => api.request('POST', `/closings/${date}/close`),
  };
}
