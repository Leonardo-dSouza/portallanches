// Segunda a domingo, como no calendário da parede (o valor segue `Date.getDay`: 0 = domingo).
const CHOICES: readonly { weekday: number | null; label: string }[] = [
  { weekday: null, label: 'Todos' },
  { weekday: 1, label: 'Seg' },
  { weekday: 2, label: 'Ter' },
  { weekday: 3, label: 'Qua' },
  { weekday: 4, label: 'Qui' },
  { weekday: 5, label: 'Sex' },
  { weekday: 6, label: 'Sáb' },
  { weekday: 0, label: 'Dom' },
];

interface WeekdayFilterProps {
  value: number | null;
  onChange(weekday: number | null): void;
}

/** Só um dia da semana no Histórico (ex.: todas as quintas do mês), ou todos. */
export function WeekdayFilter({ value, onChange }: WeekdayFilterProps) {
  return (
    <fieldset
      className="choice choice-row weekday-filter"
      aria-label="Dia da semana"
    >
      {CHOICES.map(({ weekday, label }) => (
        <label key={label}>
          <input
            type="radio"
            name="weekday"
            checked={value === weekday}
            onChange={() => onChange(weekday)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
