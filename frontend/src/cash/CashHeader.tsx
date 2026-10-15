import { RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/auth-context';
import { formatDateWithWeekday } from '../history/date-keys';
import { DayPicker } from './DayPicker';
import type { CashDay } from './use-cash-day';

const STATUS_LABEL = { OPEN: 'Aberto', CLOSED: 'Fechado' } as const;

interface CashHeaderProps {
  day: CashDay;
  isToday: boolean;
  today: string;
  onRefresh(): void;
  onPickDate(date: string | null): void;
}

export function CashHeader({
  day,
  isToday,
  today,
  onRefresh,
  onPickDate,
}: CashHeaderProps) {
  const { businessDate, status } = day.closing;
  // O caixa fica na noite em andamento (2026-10-15): dia passado é com o admin.
  const isAdmin = useAuth().user?.role === 'ADMIN';
  return (
    <div className="cash-header">
      {/* Sem o "Fechamento diário" em cima (2026-10-11): cada linha conta na tela do caixa. */}
      <h1>Caixa de {formatDateWithWeekday(businessDate)}</h1>
      <span className="badge" data-status={status}>
        {STATUS_LABEL[status]}
      </span>
      {isAdmin && (
        <DayPicker
          value={businessDate}
          today={today}
          isToday={isToday}
          onPick={onPickDate}
        />
      )}
      <button
        type="button"
        className="button button-secondary"
        onClick={onRefresh}
      >
        <RefreshCw aria-hidden />
        Atualizar
      </button>
    </div>
  );
}
