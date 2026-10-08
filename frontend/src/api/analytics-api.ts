import type { AnalyticsReport } from './analytics-types';
import type { ApiClient } from './api-client';
import type { DateRange } from './types';

/** Análise para o gerente (só admin). */
export interface AnalyticsApi {
  report(range: DateRange): Promise<AnalyticsReport>;
}

/** @example await createAnalyticsApi(api).report({ from: '2026-09-01', to: '2026-09-30' }); */
export function createAnalyticsApi(api: ApiClient): AnalyticsApi {
  return {
    report: ({ from, to }) =>
      api.request('GET', `/analytics?from=${from}&to=${to}`),
  };
}
