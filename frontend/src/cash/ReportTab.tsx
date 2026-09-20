import { useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { formatMoney } from '../api/money';
import type { ClosingReport } from '../api/types';
import { CloseDayButton } from './CloseDayButton';
import type { CashDay } from './use-cash-day';

interface ReportTabProps {
  cash: CashApi;
  day: CashDay;
  onChanged(): void;
}

function ReportFigures({ report }: { report: ClosingReport }) {
  return (
    <dl className="report">
      <dt>Pedidos ({report.orders.count})</dt>
      <dd>{formatMoney(report.orders.total)}</dd>
      {report.byPaymentMethod.map((entry) => (
        <div key={entry.paymentMethodId} className="report-sub">
          <dt>
            {entry.name} ({entry.ordersCount})
          </dt>
          <dd>{formatMoney(entry.total)}</dd>
        </div>
      ))}
      <dt>Entregas ({report.delivery.count}): taxas</dt>
      <dd>{formatMoney(report.delivery.feesTotal)}</dd>
      <dt>Motoboy: diária {formatMoney(report.motoboy.dailyRate)} + taxas</dt>
      <dd>{formatMoney(report.motoboy.totalCost)}</dd>
      <dt>Gastos ({report.expenses.count})</dt>
      <dd>{formatMoney(report.expenses.total)}</dd>
    </dl>
  );
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
  if (!report) return <p className="page-message">Carregando relatório…</p>;
  return (
    <div className="card">
      <ReportFigures report={report} />
      {day.closing.status === 'OPEN' && (
        <CloseDayButton cash={cash} onClosed={onChanged} />
      )}
    </div>
  );
}
