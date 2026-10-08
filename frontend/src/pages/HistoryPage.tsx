import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createAdminApi } from '../api/admin-api';
import { useApi } from '../api/api-context';
import type { DateRange } from '../api/types';
import { LoadFailure } from '../catalog/LoadFailure';
import { Skeleton } from '../components/Skeleton';
import { parseWeekdayParam, weekdayTotalLabel } from '../history/history-link';
import { toDateKey } from '../history/date-keys';
import { PeriodPicker } from '../history/PeriodPicker';
import { PeriodTable } from '../history/PeriodTable';
import { usePeriodChoice } from '../history/use-period-choice';
import { usePeriodReport } from '../history/use-period-report';
import { WeekdayFilter } from '../history/WeekdayFilter';

interface HistoryPageProps {
  /** Só para os testes fixarem a data; em uso normal é o dia de hoje. */
  today?: Date;
}

interface HistoryViewProps extends HistoryPageProps {
  initialRange: DateRange | null;
  initialWeekday: number | null;
}

/** `?de=&ate=` (vindo da Análise); sem os dois, null (abre na semana). */
function rangeFromUrl(params: URLSearchParams): DateRange | null {
  const from = params.get('de');
  const to = params.get('ate');
  return from && to ? { from, to } : null;
}

function HistoryView({
  today,
  initialRange,
  initialWeekday,
}: HistoryViewProps) {
  const api = useApi();
  const admin = useMemo(() => createAdminApi(api), [api]);
  const [now] = useState(() => today ?? new Date());
  const period = usePeriodChoice(now, initialRange);
  const [weekday, setWeekday] = useState(initialWeekday);
  const { report, error, loading, reload } = usePeriodReport(
    admin,
    period.range,
    weekday,
  );
  const totalsLabel =
    weekday === null ? 'Total do período' : weekdayTotalLabel(weekday);
  return (
    <section>
      <header className="cash-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Histórico</h1>
        </div>
      </header>
      <PeriodPicker
        choice={period.choice}
        custom={period.custom}
        today={toDateKey(now)}
        problem={period.problem}
        onChoice={period.setChoice}
        onCustom={period.setCustom}
      />
      <WeekdayFilter value={weekday} onChange={setWeekday} />
      {loading && <Skeleton label="Carregando histórico…" rows={5} />}
      {error && <LoadFailure message={error} onRetry={reload} />}
      {report && !period.problem && (
        <PeriodTable
          report={report}
          admin={admin}
          totalsLabel={totalsLabel}
          onChanged={reload}
        />
      )}
    </section>
  );
}

/**
 * Histórico do admin: tabela de dias e totais de um período (semana, mês, ano ou datas
 * livres), opcionalmente só de um dia da semana. A Análise abre aqui com `?de=&ate=&dia=`;
 * outro link de lá remonta a tela com o filtro novo.
 */
export function HistoryPage({ today }: HistoryPageProps) {
  const [params] = useSearchParams();
  return (
    <HistoryView
      key={params.toString()}
      today={today}
      initialRange={rangeFromUrl(params)}
      initialWeekday={parseWeekdayParam(params.get('dia'))}
    />
  );
}
