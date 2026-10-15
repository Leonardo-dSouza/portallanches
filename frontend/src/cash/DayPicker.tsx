import { DateField } from '../calendar/DateField';

interface DayPickerProps {
  value: string;
  /** Hoje (`YYYY-MM-DD`): marca o dia no calendário. */
  today: string;
  /** `true` quando a tela está no "hoje" do servidor (sem data escolhida). */
  isToday: boolean;
  onPick(date: string | null): void;
}

/**
 * Escolhe o dia do caixa num calendário. Só o admin vê (2026-10-15): o caixa fica na noite em
 * andamento, que o servidor escolhe (de madrugada, a de ontem enquanto aberta).
 */
export function DayPicker({ value, today, isToday, onPick }: DayPickerProps) {
  return (
    <div className="day-picker">
      <DateField
        label="Data do caixa"
        value={value}
        today={today}
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
