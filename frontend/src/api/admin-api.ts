import type { ApiClient } from './api-client';
import type { Closing, DateRange, PeriodReport } from './types';

/** Chamadas exclusivas do admin (histórico e fechamento de qualquer dia). */
export interface AdminApi {
  periodReport(range: DateRange): Promise<PeriodReport>;
  reopenDay(date: string): Promise<Closing>;
  closeDay(date: string): Promise<Closing>;
}

/** @example const admin = createAdminApi(api); await admin.reopenDay('2026-09-22'); */
export function createAdminApi(api: ApiClient): AdminApi {
  return {
    periodReport: ({ from, to }) =>
      api.request('GET', `/reports?from=${from}&to=${to}`),
    reopenDay: (date) => api.request('POST', `/closings/${date}/reopen`),
    closeDay: (date) => api.request('POST', `/closings/${date}/close`),
  };
}
