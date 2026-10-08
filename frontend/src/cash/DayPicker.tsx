import { useAuth } from '../auth/auth-context';
import { DateField } from '../calendar/DateField';
import { addDays, parseDateKey, toDateKey } from '../history/date-keys';

// O perfil caixa abre hoje e os 7 dias anteriores: espelha `SELECTABLE_DAYS_BACK` em
// backend/src/closing/closing-access.ts (a API continua sendo quem decide).
const CASHIER_DAYS_BACK = 7;

interface DayPickerProps {
  value: string;
  /** Hoje (`YYYY-MM-DD`): marca o dia no calendário e limita a janela do caixa. */
  today: string;
  /** `true` quando a tela está no "hoje" do servidor (sem data escolhida). */
  isToday: boolean;
  onPick(date: string | null): void;
}

/** Fora da janela do caixa (antes de 7 dias atrás ou depois de hoje). */
function outsideCashierWindow(today: string): (date: string) => boolean {
  const todayDate = parseDateKey(today) ?? new Date();
  const oldest = toDateKey(addDays(todayDate, -CASHIER_DAYS_BACK));
  return (date) => date < oldest || date > today;
}

/**
 * Escolhe o dia do caixa num calendário: o admin abre qualquer dia; o caixa, só hoje e os
 * 7 dias anteriores (os outros aparecem desativados).
 */
export function DayPicker({ value, today, isToday, onPick }: DayPickerProps) {
  const { user } = useAuth();
  const isCashier = user?.role !== 'ADMIN';
  return (
    <div className="day-picker">
      <DateField
        label="Data do caixa"
        value={value}
        today={today}
        isDisabled={isCashier ? outsideCashierWindow(today) : undefined}
        onChange={onPick}
      />
      {!isToday && (
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onPick(null)}
        >
          Voltar para hoje
        </button>
      )}
    </div>
  );
}
