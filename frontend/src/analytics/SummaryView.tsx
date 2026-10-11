import { useMemo } from 'react';
import { createAnalyticsApi } from '../api/analytics-api';
import { useApi } from '../api/api-context';
import type { DateRange } from '../api/types';
import { LoadFailure } from '../catalog/LoadFailure';
import { Skeleton } from '../components/Skeleton';
import { useRangeData } from '../history/use-range-data';
import { AnalyticsBoard } from './AnalyticsBoard';

/**
 * Aba Resumo da Análise: o visor e os blocos do período escolhido.
 *
 * @example <SummaryView range={period.range} />
 */
export function SummaryView({ range }: { range: DateRange | null }) {
  const api = useApi();
  const analytics = useMemo(() => createAnalyticsApi(api), [api]);
  const { data, error, loading, reload } = useRangeData(
    analytics.report,
    range,
  );
  return (
    <>
      {loading && <Skeleton label="Carregando análise…" rows={6} />}
      {error && <LoadFailure message={error} onRetry={reload} />}
      {data && range && <AnalyticsBoard report={data} />}
    </>
  );
}
