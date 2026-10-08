import { useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { formatMoney } from '../api/money';
import type { ClosingReport, PaymentMethodTotal } from '../api/types';
import { Skeleton } from '../components/Skeleton';
import { CloseDayButton } from './CloseDayButton';
import { paymentModeLabel } from './payment-choice';
import type { CashDay } from './use-cash-day';

interface ReportTabProps {
  cash: CashApi;
  day: CashDay;
  onChanged(): void;
}

interface FigureProps {
  label: string;
  value: string;
  /** Subtotal de um meio da maquininha, recuado sob a forma. */
  nested?: boolean;
}

function Figure({ label, value, nested = false }: FigureProps) {
  const className = nested ? 'report-nested' : undefined;
  return (
    <>
      <dt className={className}>{label}</dt>
      <dd className={className}>{value}</dd>
    </>
  );
}

function PaymentFigures({ entry }: { entry: PaymentMethodTotal }) {
  return (
    <>
      <Figure
        label={`${entry.name} (${entry.ordersCount})`}
        value={formatMoney(entry.total)}
      />
      {entry.byMode.map((sub) => (
        <Figure
          key={sub.mode}
          nested
          label={`${paymentModeLabel(sub.mode)} (${sub.ordersCount})`}
          value={formatMoney(sub.total)}
        />
      ))}
    </>
  );
}

function ReportFigures({ report }: { report: ClosingReport }) {
  return (
    <div className="report-sections">
      <section className="report-section">
        <h2>Vendas</h2>
        <dl className="report">
          <Figure
            label={`Pedidos (${report.orders.count})`}
            value={formatMoney(report.orders.total)}
          />
        </dl>
        <dl className="report report-sub">
          {report.byPaymentMethod.map((entry) => (
            <PaymentFigures key={entry.paymentMethodId} entry={entry} />
          ))}
          {report.withoutPaymentMethod.count > 0 && (
            <Figure
              label={`Sem forma de pagamento (${report.withoutPaymentMethod.count})`}
              value={formatMoney(report.withoutPaymentMethod.total)}
            />
          )}
        </dl>
      </section>
      <section className="report-section">
        <h2>Entregas e motoboy</h2>
        <dl className="report">
          <Figure
            label={`Entregas (${report.delivery.count}): taxas`}
            value={formatMoney(report.delivery.feesTotal)}
          />
          <Figure
            label={`Motoboy: diária ${formatMoney(report.motoboy.dailyRate)} + taxas`}
            value={formatMoney(report.motoboy.totalCost)}
          />
        </dl>
      </section>
      <section className="report-section">
        <h2>Gastos</h2>
        <dl className="report">
          <Figure
            label={`Gastos (${report.expenses.count})`}
            value={formatMoney(report.expenses.total)}
          />
        </dl>
      </section>
    </div>
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
