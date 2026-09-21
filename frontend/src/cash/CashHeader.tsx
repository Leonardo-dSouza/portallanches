import { DayPicker } from './DayPicker';
import type { CashDay } from './use-cash-day';

const STATUS_LABEL = { OPEN: 'Aberto', CLOSED: 'Fechado' } as const;

interface CashHeaderProps {
  day: CashDay;
  isToday: boolean;
  onRefresh(): void;
  onPickDate(date: string | null): void;
}

export function CashHeader({
  day,
  isToday,
  onRefresh,
  onPickDate,
}: CashHeaderProps) {
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
      <DayPicker value={businessDate} isToday={isToday} onPick={onPickDate} />
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
