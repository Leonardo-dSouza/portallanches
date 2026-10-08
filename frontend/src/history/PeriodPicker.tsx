import type { DateRange } from '../api/types';
import { DateRangeField } from '../calendar/DateRangeField';

export type PickerChoice = 'week' | 'month' | 'year' | 'custom';

const CHOICES: { id: PickerChoice; label: string }[] = [
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mês' },
  { id: 'year', label: 'Este ano' },
  { id: 'custom', label: 'Personalizado' },
];

interface PeriodPickerProps {
  choice: PickerChoice;
  custom: DateRange;
  /** Hoje (`AAAA-MM-DD`), marcado no calendário do personalizado. */
  today: string;
  problem: string | null;
  onChoice(choice: PickerChoice): void;
  onCustom(range: DateRange): void;
}

export function PeriodPicker({
  choice,
  custom,
  today,
  problem,
  onChoice,
  onCustom,
}: PeriodPickerProps) {
  return (
    <div className="period-picker">
      <fieldset className="choice choice-row" aria-label="Período">
        {CHOICES.map(({ id, label }) => (
          <label key={id}>
            <input
              type="radio"
              name="period"
              checked={choice === id}
              onChange={() => onChoice(id)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      {choice === 'custom' && (
        <div className="period-dates">
          <DateRangeField
            label="Período"
            value={custom}
            today={today}
            onChange={onCustom}
          />
        </div>
      )}
      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
