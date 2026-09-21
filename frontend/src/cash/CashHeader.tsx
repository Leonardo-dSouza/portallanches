import type { CashDay } from './use-cash-day';

const STATUS_LABEL = { OPEN: 'Aberto', CLOSED: 'Fechado' } as const;

interface CashHeaderProps {
  day: CashDay;
  onRefresh(): void;
}

export function CashHeader({ day, onRefresh }: CashHeaderProps) {
  const { businessDate, status } = day.closing;
  return (
    <div className="cash-header">
      <div>
        <p className="eyebrow">Fechamento diário</p>
        <h1>Caixa de {businessDate.split('-').reverse().join('/')}</h1>
      </div>
      <span className="badge" data-status={status}>
        {STATUS_LABEL[status]}
      </span>
      <button
        type="button"
        className="button button-secondary"
        onClick={onRefresh}
      >
        Atualizar
      </button>
    </div>
  );
}
