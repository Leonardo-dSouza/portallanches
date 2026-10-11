import { formatShortDate } from './calendar-math';
import { DatePopoverField } from './DatePopoverField';
import { SingleDayPicker } from './SingleDayPicker';

interface OptionalDateFieldProps {
  label: string;
  /** Data escolhida (`AAAA-MM-DD`) ou '' quando não há. */
  value: string;
  today: string;
  /** O que o botão mostra sem data (ex.: "Sem validade"). */
  emptyText: string;
  hideLabel?: boolean;
  onChange(date: string): void;
}

/**
 * Data que pode ficar em branco, no mesmo calendário do resto do app (2026-10-11: a validade
 * da Entrada usava o campo do navegador, com outro visual). "Sem data" limpa.
 *
 * @example <OptionalDateField label="Validade" emptyText="Sem validade" value="" today={today} onChange={set} />
 */
export function OptionalDateField(props: OptionalDateFieldProps) {
  return (
    <DatePopoverField
      label={props.label}
      hideLabel={props.hideLabel}
      valueText={props.value ? formatShortDate(props.value) : props.emptyText}
    >
      <SingleDayPicker
        value={props.value}
        today={props.today}
        isDisabled={() => false}
        onPicked={props.onChange}
        onClear={() => props.onChange('')}
      />
    </DatePopoverField>
  );
}
