import type { DateRange } from '../api/types';
import { TextField } from '../components/TextField';

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
  problem: string | null;
  onChoice(choice: PickerChoice): void;
  onCustom(range: DateRange): void;
}

export function PeriodPicker({
  choice,
  custom,
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
          <TextField
            label="De"
            type="date"
            value={custom.from}
            onChange={(from) => onCustom({ ...custom, from })}
          />
          <TextField
            label="Até"
            type="date"
            value={custom.to}
            onChange={(to) => onCustom({ ...custom, to })}
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
