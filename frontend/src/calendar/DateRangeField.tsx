import { useState } from 'react';
import type { DateRange } from '../api/types';
import { formatDate } from '../history/date-keys';
import { CalendarMonth } from './CalendarMonth';
import { cursorOf } from './calendar-math';
import { DatePopoverField } from './DatePopoverField';
import { useDatePopoverDone } from './date-popover-done';

interface DateRangeFieldProps {
  label: string;
  value: DateRange;
  today: string;
  onChange(range: DateRange): void;
}

/** Os dois dias em ordem (o segundo clique pode vir antes do primeiro). */
const ordered = (a: string, b: string): DateRange =>
  a <= b ? { from: a, to: b } : { from: b, to: a };

interface RangePickerProps {
  value: DateRange;
  today: string;
  onPicked(range: DateRange): void;
}

/**
 * O mês aberto no intervalo atual: o 1º clique marca o início (o intervalo antigo some), o
 * 2º marca o fim e aplica.
 */
function RangePicker({ value, today, onPicked }: RangePickerProps) {
  const [cursor, setCursor] = useState(() => cursorOf(value.from));
  const [focusKey, setFocusKey] = useState(value.from);
  const [start, setStart] = useState<string | null>(null);
  const done = useDatePopoverDone();
  const pick = (day: string) => {
    if (start === null) return setStart(day);
    onPicked(ordered(start, day));
    done();
  };
  return (
    <>
      <CalendarMonth
        cursor={cursor}
        onCursor={setCursor}
        focusKey={focusKey}
        onFocusKey={setFocusKey}
        selection={start ? { from: start, to: start } : value}
        today={today}
        isDisabled={() => false}
        onPick={pick}
      />
      <div className="calendar-foot" aria-live="polite">
        <span>{start ? 'Agora o último dia.' : 'Escolha o primeiro dia.'}</span>
      </div>
    </>
  );
}

/**
 * Período em datas livres num calendário só: dois cliques (primeiro e último dia).
 *
 * @example <DateRangeField label="Período" value={range} today={today} onChange={setRange} />
 */
export function DateRangeField(props: DateRangeFieldProps) {
  const { value } = props;
  return (
    <DatePopoverField
      label={props.label}
      valueText={`${formatDate(value.from)} a ${formatDate(value.to)}`}
    >
      <RangePicker
        value={value}
        today={props.today}
        onPicked={props.onChange}
      />
    </DatePopoverField>
  );
}
