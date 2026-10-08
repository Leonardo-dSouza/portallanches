import { useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { ClosingReport } from '../api/types';
import { Skeleton } from '../components/Skeleton';
import { CloseDayButton } from './CloseDayButton';
import { ReportFigures } from './ReportFigures';
import type { CashDay } from './use-cash-day';

interface ReportTabProps {
  cash: CashApi;
  day: CashDay;
  onChanged(): void;
}

/** Confere os totais do dia antes de fechar; recarrega quando pedidos ou gastos mudam. */
export function ReportTab({ cash, day, onChanged }: ReportTabProps) {
  const [report, setReport] = useState<ClosingReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    cash
      .reportToday()
      .then(setReport, (failure) => setError(errorMessage(failure)));
  }, [cash, day]);
  if (error)
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  if (!report) return <Skeleton label="Carregando relatório…" rows={4} />;
  return (
    <div className="report-page">
      <ReportFigures report={report} />
      {day.closing.status === 'OPEN' && (
        <section className="card close-panel">
          <h2>Fechamento</h2>
          <p className="hint">Confira os totais acima antes de fechar o dia.</p>
          <CloseDayButton cash={cash} onClosed={onChanged} />
        </section>
      )}
    </div>
  );
}
