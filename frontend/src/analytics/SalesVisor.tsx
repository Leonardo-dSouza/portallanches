import { useId } from 'react';
import type { SalesChanges, SalesTotals } from '../api/analytics-types';
import { formatMoney } from '../api/money';
import { ChangeBadge } from './ChangeBadge';

interface VisorFigure {
  key: keyof SalesChanges;
  label: string;
  value(totals: SalesTotals): string;
}

const FIGURES: readonly VisorFigure[] = [
  {
    key: 'revenue',
    label: 'Faturamento',
    value: (t) => formatMoney(t.revenue),
  },
  { key: 'orders', label: 'Pedidos', value: (t) => String(t.orders) },
  {
    key: 'averageTicket',
    label: 'Ticket médio',
    value: (t) => formatMoney(t.averageTicket),
  },
  { key: 'deliveries', label: 'Entregas', value: (t) => String(t.deliveries) },
];

interface SalesVisorProps {
  totals: SalesTotals;
  previous: SalesTotals;
  changes: SalesChanges;
}

function VisorCell(props: SalesVisorProps & { figure: VisorFigure }) {
  const { figure, totals, previous, changes } = props;
  const labelId = useId();
  return (
    <div className="visor-figure" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="visor-label">
        {figure.label}
      </span>
      <strong className="visor-value">{figure.value(totals)}</strong>
      <ChangeBadge change={changes[figure.key]} />
      <small className="visor-before">antes {figure.value(previous)}</small>
    </div>
  );
}

/** O visor da caixa registradora: os quatro números do período e quanto mudaram. */
export function SalesVisor(props: SalesVisorProps) {
  return (
    <div className="sales-visor">
      {FIGURES.map((figure) => (
        <VisorCell key={figure.key} figure={figure} {...props} />
      ))}
    </div>
  );
}
