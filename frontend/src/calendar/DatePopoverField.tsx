import { CalendarDays, ChevronDown } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { DatePopoverDone } from './date-popover-done';
import { useDismiss } from './use-dismiss';

interface DatePopoverFieldProps {
  label: string;
  /** O que o botão mostra ("qua, 07/10/2026" ou "01/09/2026 a 30/09/2026"). */
  valueText: string;
  /** O painel; ele fecha com `useDatePopoverDone()` depois de escolher. */
  children: ReactNode;
}

/**
 * A moldura dos campos de data: rótulo, botão com o valor e o painel do mês logo abaixo.
 * Esc e "pronto" devolvem o foco ao botão; clicar fora só fecha (o usuário já foi para
 * outro lugar).
 *
 * @example <DatePopoverField label="Data" valueText="qua, 07/10/2026"><SingleDayPicker … /></DatePopoverField>
 */
export function DatePopoverField(props: DatePopoverFieldProps) {
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
        {props.label}
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
        <span id={valueId}>{props.valueText}</span>
        <ChevronDown aria-hidden className="date-field-chevron" />
      </button>
      {open && (
        <div
          className="date-popover"
          role="dialog"
          aria-label={`Escolher ${props.label.toLowerCase()}`}
        >
          <DatePopoverDone.Provider value={() => close(true)}>
            {props.children}
          </DatePopoverDone.Provider>
        </div>
      )}
    </div>
  );
}
