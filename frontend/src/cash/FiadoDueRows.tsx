import { CalendarClock, HandCoins } from 'lucide-react';
import type { FiadoDueOrder } from '../api/fiado-types';
import { formatMoney, moneyToCents } from '../api/money';
import { formatDayLabel } from '../history/date-keys';
import { dueStatusText, type FiadoTarget } from './fiado-labels';

interface FiadoDueRowsProps {
  due: FiadoDueOrder[];
  /** A noite do caixa: diz se a previsão é para hoje ou atrasada. */
  today: string;
  locked: boolean;
  onReceive(target: FiadoTarget): void;
  onReschedule(target: FiadoTarget): void;
}

type FiadoDueRowProps = Omit<FiadoDueRowsProps, 'due'> & {
  order: FiadoDueOrder;
};

function FiadoDueActions({ order, ...props }: FiadoDueRowProps) {
  if (props.locked) return <td className="row-actions" />;
  return (
    <td className="row-actions">
      <button
        type="button"
        className="button button-secondary button-sm"
        aria-label="Receber"
        title="Receber o fiado (entra na gaveta desta noite)"
        onClick={() => props.onReceive(order)}
      >
        <HandCoins aria-hidden />
      </button>
      <button
        type="button"
        className="button-ghost button-sm"
        aria-label="Remarcar"
        title="Remarcar o dia de pagar"
        onClick={() => props.onReschedule(order)}
      >
        <CalendarClock aria-hidden />
      </button>
    </td>
  );
}

function FiadoDueRow(props: FiadoDueRowProps) {
  const { order, today } = props;
  const night = formatDayLabel(order.businessDate);
  const paid = moneyToCents(order.paidTotal) > 0;
  return (
    <tr className="fiado-due-row">
      <td className="order-number-cell">
        #{order.dayNumber}
        <span className="cell-sub">{night}</span>
      </td>
      <td className="order-customer-cell">
        <span className="tag" data-kind="FIADO">
          Fiado
        </span>{' '}
        {order.customerName}
        <span className="cell-sub">
          {order.dueDate && dueStatusText(order.dueDate, today)}
        </span>
      </td>
      <td colSpan={2} className="fiado-due-note">
        Fiado de {night}
        {paid &&
          `: já pagou ${formatMoney(order.paidTotal)} de ${formatMoney(order.amount)}`}
      </td>
      <td className="num strong">falta {formatMoney(order.remaining)}</td>
      <FiadoDueActions {...props} />
    </tr>
  );
}

/**
 * Os fiados de outras noites a cobrar nesta (2026-10-25), no topo de Todos e A pagar: o mais
 * atrasado primeiro, com Receber e Remarcar. Não entram no relatório nem no fechamento da noite.
 */
export function FiadoDueRows({ due, ...props }: FiadoDueRowsProps) {
  if (due.length === 0) return null;
  return (
    <tbody className="fiado-due">
      {due.map((order) => (
        <FiadoDueRow key={order.orderId} order={order} {...props} />
      ))}
    </tbody>
  );
}
