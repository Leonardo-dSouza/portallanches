import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createAnalyticsApi } from '../api/analytics-api';
import { useApi } from '../api/api-context';
import type { DateRange } from '../api/types';
import { AnalyticsBoard } from '../analytics/AnalyticsBoard';
import { LoadFailure } from '../catalog/LoadFailure';
import { Skeleton } from '../components/Skeleton';
import { PeriodPicker } from '../history/PeriodPicker';
import { usePeriodChoice } from '../history/use-period-choice';
import { useRangeData } from '../history/use-range-data';

interface AnalyticsPageProps {
  /** Só para os testes fixarem a data; em uso normal é o dia de hoje. */
  today?: Date;
}

/** `?de=AAAA-MM-DD&ate=AAAA-MM-DD` (o dia que veio do Histórico); sem os dois, null. */
function rangeFromUrl(params: URLSearchParams): DateRange | null {
  const from = params.get('de');
  const to = params.get('ate');
  return from && to ? { from, to } : null;
}

function AnalyticsView({
  initial,
  today,
}: {
  initial: DateRange | null;
  today?: Date;
}) {
  const api = useApi();
  const analytics = useMemo(() => createAnalyticsApi(api), [api]);
  const [now] = useState(() => today ?? new Date());
  const period = usePeriodChoice(now, initial);
  const { data, error, loading, reload } = useRangeData(
    analytics.report,
    period.range,
  );
  return (
    <section className="analytics-page">
      <header className="cash-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Análise</h1>
        </div>
      </header>
      <PeriodPicker
        choice={period.choice}
        custom={period.custom}
        problem={period.problem}
        onChoice={period.setChoice}
        onCustom={period.setCustom}
      />
      {loading && <Skeleton label="Carregando análise…" rows={6} />}
      {error && <LoadFailure message={error} onRetry={reload} />}
      {data && !period.problem && <AnalyticsBoard report={data} />}
    </section>
  );
}

/**
 * Análise para o gerente (só admin): o período escolhido comparado com o anterior. Abre
 * na semana ou no dia que veio do Histórico; outro dia vindo de lá remonta a tela.
 */
export function AnalyticsPage({ today }: AnalyticsPageProps) {
  const [params] = useSearchParams();
  return (
    <AnalyticsView
      key={params.toString()}
      initial={rangeFromUrl(params)}
      today={today}
    />
  );
}
