import { useMemo, useState } from 'react';
import { createAdminApi } from '../api/admin-api';
import { useApi } from '../api/api-context';
import { LoadFailure } from '../catalog/LoadFailure';
import { Skeleton } from '../components/Skeleton';
import { PeriodPicker } from '../history/PeriodPicker';
import { PeriodTable } from '../history/PeriodTable';
import { usePeriodChoice } from '../history/use-period-choice';
import { usePeriodReport } from '../history/use-period-report';

interface HistoryPageProps {
  /** Só para os testes fixarem a data; em uso normal é o dia de hoje. */
  today?: Date;
}

/** Histórico do admin: tabela de dias e totais de um período (semana, mês, ano ou datas livres). */
export function HistoryPage({ today }: HistoryPageProps) {
  const api = useApi();
  const admin = useMemo(() => createAdminApi(api), [api]);
  const [now] = useState(() => today ?? new Date());
  const period = usePeriodChoice(now, null);
  const { report, error, loading, reload } = usePeriodReport(
    admin,
    period.range,
  );
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
        problem={period.problem}
        onChoice={period.setChoice}
        onCustom={period.setCustom}
      />
      {loading && <Skeleton label="Carregando histórico…" rows={5} />}
      {error && <LoadFailure message={error} onRetry={reload} />}
      {report && !period.problem && (
        <PeriodTable report={report} admin={admin} onChanged={reload} />
      )}
    </section>
  );
}
