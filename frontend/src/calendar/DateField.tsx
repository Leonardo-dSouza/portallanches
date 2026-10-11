import { formatShortDate } from './calendar-math';
import { DatePopoverField } from './DatePopoverField';
import { SingleDayPicker } from './SingleDayPicker';

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

/**
 * Campo de uma data no visual do app: um botão com a data ("qua, 07/10/2026") que abre o mês
 * logo abaixo. Escolher, Esc ou clicar fora fecham.
 *
 * @example <DateField label="Data do caixa" value={date} today={today} onChange={setDate} />
 */
export function DateField(props: DateFieldProps) {
  const isDisabled = props.isDisabled ?? (() => false);
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
