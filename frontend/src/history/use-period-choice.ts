import { useState } from 'react';
import type { DateRange } from '../api/types';
import type { PickerChoice } from './PeriodPicker';
import { presetRange, rangeError } from './period-range';

export interface PeriodChoice {
  choice: PickerChoice;
  custom: DateRange;
  /** Mensagem do intervalo personalizado inválido; null quando a API aceita. */
  problem: string | null;
  /** Período a buscar; null quando o personalizado é inválido. */
  range: DateRange | null;
  setChoice(choice: PickerChoice): void;
  setCustom(range: DateRange): void;
}

/**
 * Estado do `PeriodPicker`: atalho (semana, mês, ano) ou datas livres. `initial` abre direto
 * num intervalo (ex.: o dia que veio do Histórico); sem ele, abre na semana.
 *
 * @example const period = usePeriodChoice(new Date(), null);
 */
export function usePeriodChoice(
  now: Date,
  initial: DateRange | null,
): PeriodChoice {
  const [choice, setChoice] = useState<PickerChoice>(
    initial ? 'custom' : 'week',
  );
  const [custom, setCustom] = useState<DateRange>(
    () => initial ?? presetRange('month', now),
  );
  const problem = choice === 'custom' ? rangeError(custom) : null;
  const preset = choice === 'custom' ? custom : presetRange(choice, now);
  return {
    choice,
    custom,
    problem,
    range: problem ? null : preset,
    setChoice,
    setCustom,
  };
}
