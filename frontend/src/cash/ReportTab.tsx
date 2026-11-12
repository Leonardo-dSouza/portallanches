import { useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { ClosingReport } from '../api/types';
import { Skeleton } from '../components/Skeleton';
import { CloseDayButton } from './CloseDayButton';
import { OpeningCashCorrection } from './CorrectOpeningCashButton';
import { DrawerCountForm } from './DrawerCountForm';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { openAccountsOf } from './open-accounts';
import { ReportFigures } from './ReportFigures';
import type { CashDay } from './use-cash-day';

interface ReportTabProps {
  cash: CashApi;
  day: CashDay;
  onChanged(): void;
}

/**
 * As contas A pagar que seguram o fechamento (card 8, 2026-11-08): o backend já recusa fechar
 * com elas; aqui o caixa vê quais são antes de tentar.
 */
function OpenAccountsWarning({ open }: { open: Order[] }) {
  if (open.length === 0) return null;
  return (
    <div className="open-accounts-warning" role="alert">
      <p>Receba as contas A pagar antes de fechar o dia:</p>
      <ul>
        {open.map((order) => (
          <li key={order.id}>
            #{order.dayNumber} {order.customerName} ·{' '}
            {formatMoney(order.amount)}
          </li>
        ))}
      </ul>
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
      <ReportFigures
        report={report}
        action={
          <OpeningCashCorrection
            cash={cash}
            openingCash={report.drawer.openingCash}
            onSaved={onChanged}
          />
        }
      />
      {day.closing.status === 'OPEN' && (
        <section className="card close-panel">
          <h2>Fechamento</h2>
          <p className="hint">
            {report.drawer.countRequired
              ? 'Conte a gaveta, o PIX e cada maquininha. Fechar o dia grava a contagem.'
              : 'Confira os totais acima antes de fechar o dia.'}
          </p>
          <OpenAccountsWarning open={openAccountsOf(day.orders)} />
          {report.drawer.countRequired ? (
            <DrawerCountForm
              cash={cash}
              toCount={report.drawer.toCount}
              onClosed={onChanged}
              blocked={openAccountsOf(day.orders).length > 0}
            />
          ) : (
            <CloseDayButton
              cash={cash}
              onClosed={onChanged}
              blocked={openAccountsOf(day.orders).length > 0}
            />
          )}
        </section>
      )}
    </div>
  );
}
