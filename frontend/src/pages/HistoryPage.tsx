import { useMemo, useState } from 'react';
import { createAdminApi } from '../api/admin-api';
import { useApi } from '../api/api-context';
import type { DateRange } from '../api/types';
import { Skeleton } from '../components/Skeleton';
import { PeriodPicker, type PickerChoice } from '../history/PeriodPicker';
import { PeriodTable } from '../history/PeriodTable';
import { presetRange, rangeError } from '../history/period-range';
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
  const [choice, setChoice] = useState<PickerChoice>('week');
  const [custom, setCustom] = useState<DateRange>(() =>
    presetRange('month', now),
  );
  const problem = choice === 'custom' ? rangeError(custom) : null;
  const range = choice === 'custom' ? custom : presetRange(choice, now);
  const { report, error, loading, reload } = usePeriodReport(
    admin,
    problem ? null : range,
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
        choice={choice}
        custom={custom}
        problem={problem}
        onChoice={setChoice}
        onCustom={setCustom}
      />
      {loading && <Skeleton label="Carregando histórico…" rows={5} />}
      {error && (
        <div className="form-error" role="alert">
          <p>{error}</p>
          <button type="button" className="button-ghost" onClick={reload}>
            Tentar de novo
          </button>
        </div>
      )}
      {report && !problem && (
        <PeriodTable report={report} admin={admin} onChanged={reload} />
      )}
    </section>
  );
}
