import type { CSSProperties } from 'react';
import type { DaySales } from '../api/analytics-types';
import { formatMoney } from '../api/money';
import { formatDayLabel } from '../history/date-keys';
import { barShare, countLabel } from './analytics-format';
import { formatTick, niceCeiling } from './column-scale';

// Até isso de noites, cada coluna leva o rótulo do dia; mais que isso, só a primeira e a última.
const LABEL_EVERY_DAY_UP_TO = 14;

const describeDay = (day: DaySales): string =>
  `${formatDayLabel(day.businessDate)}: ${formatMoney(day.revenue)} em ${countLabel(day.orders, 'pedido', 'pedidos')}`;

function showsLabel(index: number, count: number): boolean {
  return count <= LABEL_EVERY_DAY_UP_TO || index === 0 || index === count - 1;
}

function DayColumn({ day, top }: { day: DaySales; top: number }) {
  return (
    <div className="column-slot">
      <span
        className="column-bar"
        role="img"
        tabIndex={0}
        aria-label={describeDay(day)}
        style={{ height: barShare(Number(day.revenue), top) }}
      />
      <span className="column-tip" aria-hidden>
        <strong>{formatMoney(day.revenue)}</strong>
        <span>{formatDayLabel(day.businessDate)}</span>
        <span>{countLabel(day.orders, 'pedido', 'pedidos')}</span>
      </span>
    </div>
  );
}

/** Tabela para leitor de tela: os mesmos números das colunas, sem depender do mouse. */
function DaysTable({ days }: { days: DaySales[] }) {
  return (
    <table className="sr-only">
      <caption>Faturamento por noite</caption>
      <tbody>
        {days.map((day) => (
          <tr key={day.businessDate}>
            <th scope="row">{formatDayLabel(day.businessDate)}</th>
            <td>{formatMoney(day.revenue)}</td>
            <td>{countLabel(day.orders, 'pedido', 'pedidos')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Faturamento de cada noite com fechamento, em colunas finas sobre uma linha de base.
 * Passar o mouse ou focar (Tab) numa coluna mostra o valor e os pedidos.
 */
export function DailyColumns({ days }: { days: DaySales[] }) {
  const top = niceCeiling(Math.max(...days.map((day) => Number(day.revenue))));
  const columns = { '--columns': days.length } as CSSProperties;
  return (
    <figure className="daily-columns">
      <div className="columns-plot" style={columns}>
        <span className="columns-tick" data-at="top">
          {formatTick(top)}
        </span>
        <span className="columns-tick" data-at="half">
          {formatTick(top / 2)}
        </span>
        {days.map((day) => (
          <DayColumn key={day.businessDate} day={day} top={top} />
        ))}
      </div>
      <div className="columns-axis" style={columns} aria-hidden>
        {days.map((day, index) => (
          <span key={day.businessDate}>
            {showsLabel(index, days.length) && formatDayLabel(day.businessDate)}
          </span>
        ))}
      </div>
      <DaysTable days={days} />
    </figure>
  );
}
