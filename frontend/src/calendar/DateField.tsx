import { useState } from 'react';
import { CalendarMonth } from './CalendarMonth';
import { cursorOf, formatShortDate } from './calendar-math';
import { DatePopoverField } from './DatePopoverField';
import { useDatePopoverDone } from './date-popover-done';

interface DateFieldProps {
  label: string;
  /** Data escolhida, `AAAA-MM-DD`. */
  value: string;
  /** "Hoje" do caixa: marcado no mês e escolhido pelo botão "Hoje". */
  today: string;
  onChange(date: string): void;
  /** Dias que não podem ser escolhidos (ex.: fora da janela do perfil caixa). */
  isDisabled?(date: string): boolean;
}

const nothingDisabled = () => false;

interface SingleDayPickerProps {
  value: string;
  today: string;
  isDisabled(date: string): boolean;
  onPicked(date: string): void;
}

/** O mês aberto: começa no mês da data escolhida, com o foco nela. */
function SingleDayPicker(props: SingleDayPickerProps) {
  const [cursor, setCursor] = useState(() => cursorOf(props.value));
  const [focusKey, setFocusKey] = useState(props.value);
  const done = useDatePopoverDone();
  const pick = (date: string) => {
    props.onPicked(date);
    done();
  };
  return (
    <>
      <CalendarMonth
        cursor={cursor}
        onCursor={setCursor}
        focusKey={focusKey}
        onFocusKey={setFocusKey}
        selection={{ from: props.value, to: props.value }}
        today={props.today}
        isDisabled={props.isDisabled}
        onPick={pick}
      />
      <div className="calendar-foot">
        <span>Setas e Enter também escolhem.</span>
        <button
          type="button"
          className="button-ghost button-sm"
          disabled={props.isDisabled(props.today)}
          onClick={() => pick(props.today)}
        >
          Hoje
        </button>
      </div>
    </>
  );
}

/**
 * Campo de uma data no visual do app: um botão com a data ("qua, 07/10/2026") que abre o mês
 * logo abaixo. Escolher, Esc ou clicar fora fecham.
 *
 * @example <DateField label="Data do caixa" value={date} today={today} onChange={setDate} />
 */
export function DateField(props: DateFieldProps) {
  const isDisabled = props.isDisabled ?? nothingDisabled;
  return (
    <DatePopoverField
      label={props.label}
      valueText={formatShortDate(props.value)}
    >
      <SingleDayPicker
        value={props.value}
        today={props.today}
        isDisabled={isDisabled}
        onPicked={props.onChange}
      />
    </DatePopoverField>
  );
}
