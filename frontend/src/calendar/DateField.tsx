import { CalendarDays, ChevronDown } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { CalendarMonth } from './CalendarMonth';
import { cursorOf, formatShortDate } from './calendar-math';
import { useDismiss } from './use-dismiss';

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

interface DatePopoverProps extends Required<DateFieldProps> {
  onPicked(date: string): void;
}

/** O mês aberto: começa no mês da data escolhida, com o foco nela. */
function DatePopover(props: DatePopoverProps) {
  const [cursor, setCursor] = useState(() => cursorOf(props.value));
  const [focusKey, setFocusKey] = useState(props.value);
  const todayAllowed = !props.isDisabled(props.today);
  return (
    <div
      className="date-popover"
      role="dialog"
      aria-label={`Escolher ${props.label.toLowerCase()}`}
    >
      <CalendarMonth
        cursor={cursor}
        onCursor={setCursor}
        focusKey={focusKey}
        onFocusKey={setFocusKey}
        selection={{ from: props.value, to: props.value }}
        today={props.today}
        isDisabled={props.isDisabled}
        onPick={props.onPicked}
      />
      <div className="calendar-foot">
        <span>Setas e Enter também escolhem.</span>
        <button
          type="button"
          className="button-ghost button-sm"
          disabled={!todayAllowed}
          onClick={() => props.onPicked(props.today)}
        >
          Hoje
        </button>
      </div>
    </div>
  );
}

/**
 * Campo de data no visual do app: um botão com a data ("qua, 07/10/2026") que abre o mês
 * logo abaixo. Escolher, Esc ou clicar fora fecham; escolher e Esc devolvem o foco ao botão.
 *
 * @example <DateField label="Data do caixa" value={date} today={today} onChange={setDate} />
 */
export function DateField(props: DateFieldProps) {
  const { label, value, onChange } = props;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const valueId = useId();
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };
  useDismiss(containerRef, (reason) => open && close(reason === 'escape'));
  return (
    <div className="date-field" ref={containerRef}>
      <span id={labelId} className="date-field-label">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="date-field-button"
        aria-labelledby={`${labelId} ${valueId}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarDays aria-hidden />
        <span id={valueId}>{formatShortDate(value)}</span>
        <ChevronDown aria-hidden className="date-field-chevron" />
      </button>
      {open && (
        <DatePopover
          {...props}
          isDisabled={props.isDisabled ?? nothingDisabled}
          onPicked={(date) => {
            onChange(date);
            close(true);
          }}
        />
      )}
    </div>
  );
}
