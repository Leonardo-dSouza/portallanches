import { useState } from 'react';
import { CalendarMonth } from './CalendarMonth';
import { cursorOf } from './calendar-math';
import { useDatePopoverDone } from './date-popover-done';

interface SingleDayPickerProps {
  /** '' (só no campo opcional) abre no mês de hoje sem dia marcado. */
  value: string;
  today: string;
  isDisabled(date: string): boolean;
  onPicked(date: string): void;
  /** Só no campo opcional: o botão "Sem data" do rodapé chama isto. */
  onClear?(): void;
}

/**
 * O mês aberto de um campo de uma data: começa no mês da data escolhida, com o foco nela.
 *
 * @example <SingleDayPicker value="2026-10-07" today="2026-10-08" isDisabled={() => false} onPicked={setDate} />
 */
export function SingleDayPicker(props: SingleDayPickerProps) {
  const start = props.value || props.today;
  const [cursor, setCursor] = useState(() => cursorOf(start));
  const [focusKey, setFocusKey] = useState(start);
  const done = useDatePopoverDone();
  const pick = (date: string) => {
    props.onPicked(date);
    done();
  };
  const clear = () => {
    props.onClear?.();
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
        {props.onClear && (
          <button
            type="button"
            className="button-ghost button-sm"
            onClick={clear}
          >
            Sem data
          </button>
        )}
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
