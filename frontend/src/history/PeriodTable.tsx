import { useState } from 'react';
import type { AdminApi } from '../api/admin-api';
import { formatMoney } from '../api/money';
import type { ClosingReport, PeriodReport } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { DayActionButton } from './DayActionButton';
import { formatDayLabel } from './date-keys';

interface PeriodTableProps {
  report: PeriodReport;
  admin: AdminApi;
  onChanged(): void;
}

const STATUS_LABEL = { OPEN: 'Aberto', CLOSED: 'Fechado' } as const;

function TableHead() {
  return (
    <thead>
      <tr>
        <th>Dia</th>
        <th>Situação</th>
        <th className="num">Pedidos</th>
        <th className="num">Faturamento</th>
        <th className="num">Taxas de entrega</th>
        <th className="num">Motoboy</th>
        <th className="num">Gastos</th>
        <th />
      </tr>
    </thead>
  );
}

function TotalsRow({ totals }: { totals: PeriodReport['totals'] }) {
  return (
    // <tbody> próprio (e não <tfoot>) para o total aparecer logo abaixo do cabeçalho.
    <tbody className="totals">
      <tr>
        <th colSpan={2}>Total do período</th>
        <td className="num">{totals.orders.count}</td>
        <td className="num strong">{formatMoney(totals.orders.total)}</td>
        <td className="num">{formatMoney(totals.delivery.feesTotal)}</td>
        <td className="num">{formatMoney(totals.motoboy.totalCost)}</td>
        <td className="num">{formatMoney(totals.expenses.total)}</td>
        <td />
      </tr>
    </tbody>
  );
}

interface DayRowProps {
  day: ClosingReport;
  admin: AdminApi;
  onChanged(): void;
  onError(message: string): void;
}

function DayRow({ day, admin, onChanged, onError }: DayRowProps) {
  return (
    <tr>
      <td>{formatDayLabel(day.businessDate)}</td>
      <td>
        <span className="tag" data-status={day.status}>
          {STATUS_LABEL[day.status]}
        </span>
      </td>
      <td className="num">{day.orders.count}</td>
      <td className="num strong">{formatMoney(day.orders.total)}</td>
      <td className="num">{formatMoney(day.delivery.feesTotal)}</td>
      <td className="num">{formatMoney(day.motoboy.totalCost)}</td>
      <td className="num">{formatMoney(day.expenses.total)}</td>
      <td className="row-actions">
        <DayActionButton
          day={day}
          admin={admin}
          onChanged={onChanged}
          onError={onError}
        />
      </td>
    </tr>
  );
}

/** Uma linha por dia com fechamento; totais vêm da API (nada é somado no cliente). */
export function PeriodTable({ report, admin, onChanged }: PeriodTableProps) {
  const [error, setError] = useState<string | null>(null);
  if (report.days.length === 0)
    return (
      <EmptyState
        title="Nenhum fechamento no período"
        hint="Dias sem fechamento (como as segundas) não aparecem aqui."
      />
    );
  const changed = () => {
    setError(null);
    onChanged();
  };
  return (
    <div className="card card-flush">
      {error && (
        <p className="form-error m-4" role="alert">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table className="table">
          <TableHead />
          <TotalsRow totals={report.totals} />
          <tbody>
            {report.days.map((day) => (
              <DayRow
                key={day.businessDate}
                day={day}
                admin={admin}
                onChanged={changed}
                onError={setError}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
