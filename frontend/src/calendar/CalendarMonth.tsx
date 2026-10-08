import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import {
  cursorOf,
  dayLabel,
  isInMonth,
  monthGrid,
  monthTitle,
  moveFocus,
  shiftMonth,
  type MonthCursor,
} from './calendar-math';

// Domingo primeiro, como nos calendários daqui; `abbr` dá o nome inteiro ao leitor de tela.
const WEEK_HEAD: readonly { initial: string; name: string }[] = [
  { initial: 'D', name: 'domingo' },
  { initial: 'S', name: 'segunda' },
  { initial: 'T', name: 'terça' },
  { initial: 'Q', name: 'quarta' },
  { initial: 'Q', name: 'quinta' },
  { initial: 'S', name: 'sexta' },
  { initial: 'S', name: 'sábado' },
];

/** Dias marcados: as pontas (ou o dia único) e o miolo de um intervalo. */
export interface CalendarSelection {
  from: string | null;
  to: string | null;
}

export interface CalendarMonthProps {
  cursor: MonthCursor;
  onCursor(cursor: MonthCursor): void;
  /** Dia com o foco do teclado (o único com Tab). */
  focusKey: string;
  onFocusKey(key: string): void;
  selection: CalendarSelection;
  today: string;
  isDisabled(key: string): boolean;
  onPick(key: string): void;
}

function markOf(key: string, { from, to }: CalendarSelection) {
  if (key === from || key === to) return 'end';
  if (from && to && from < key && key < to) return 'between';
  return undefined;
}

function MonthHead(props: Pick<CalendarMonthProps, 'cursor' | 'onCursor'>) {
  const { cursor, onCursor } = props;
  return (
    <div className="calendar-head">
      <button
        type="button"
        className="calendar-nav"
        aria-label="Mês anterior"
        onClick={() => onCursor(shiftMonth(cursor, -1))}
      >
        <ChevronLeft aria-hidden />
      </button>
      <span className="calendar-title" aria-live="polite">
        {monthTitle(cursor)}
      </span>
      <button
        type="button"
        className="calendar-nav"
        aria-label="Próximo mês"
        onClick={() => onCursor(shiftMonth(cursor, 1))}
      >
        <ChevronRight aria-hidden />
      </button>
    </div>
  );
}

function DayButton({ day, ...props }: CalendarMonthProps & { day: string }) {
  const mark = markOf(day, props.selection);
  return (
    <button
      type="button"
      className="calendar-day"
      data-date={day}
      data-outside={!isInMonth(day, props.cursor)}
      data-today={day === props.today}
      data-mark={mark}
      aria-label={dayLabel(day)}
      aria-pressed={mark === 'end'}
      aria-current={day === props.today ? 'date' : undefined}
      tabIndex={day === props.focusKey ? 0 : -1}
      disabled={props.isDisabled(day)}
      onFocus={() => props.onFocusKey(day)}
      onClick={() => props.onPick(day)}
    >
      {Number(day.slice(8))}
    </button>
  );
}

/**
 * Um mês em grade, de domingo a sábado. Teclado: setas andam dia/semana, PageUp/PageDown
 * trocam o mês, Home/End vão ao domingo/sábado, Enter escolhe; o foco abre no dia escolhido.
 */
export function CalendarMonth(props: CalendarMonthProps) {
  const { cursor, focusKey, onCursor, onFocusKey } = props;
  const gridRef = useRef<HTMLTableElement>(null);
  // Leva o foco ao dia certo ao abrir e a cada tecla (inclusive quando o mês troca).
  useEffect(() => {
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focusKey}"]`)
      ?.focus();
  }, [focusKey, cursor]);
  const handleKey = (event: KeyboardEvent<HTMLTableElement>) => {
    const next = moveFocus(focusKey, event.key);
    if (!next) return;
    event.preventDefault();
    if (!isInMonth(next, cursor)) onCursor(cursorOf(next));
    onFocusKey(next);
  };
  return (
    <div className="calendar">
      <MonthHead cursor={cursor} onCursor={onCursor} />
      <table
        ref={gridRef}
        className="calendar-grid"
        role="grid"
        aria-label={monthTitle(cursor)}
        onKeyDown={handleKey}
      >
        <thead>
          <tr>
            {WEEK_HEAD.map(({ initial, name }) => (
              <th key={name} scope="col" abbr={name}>
                {initial}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(cursor).map((week) => (
            <tr key={week[0]}>
              {week.map((day) => (
                <td key={day}>
                  <DayButton day={day} {...props} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
