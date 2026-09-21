import type { DateRange } from '../api/types';
import { addDays, parseDateKey, toDateKey } from './date-keys';

export type PeriodPreset = 'week' | 'month' | 'year';

/** Limite do `GET /reports` no backend. */
export const MAX_PERIOD_DAYS = 366;
const TUESDAY = 2;

/**
 * Período de um atalho, a partir de `today`. A semana vai de terça a segunda
 * (a lanchonete costuma fechar na segunda, então na prática termina no domingo).
 *
 * @example presetRange('month', new Date(2026, 8, 22)) // { from: '2026-09-01', to: '2026-09-30' }
 */
export function presetRange(preset: PeriodPreset, today: Date): DateRange {
  if (preset === 'month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: toDateKey(first), to: toDateKey(last) };
  }
  if (preset === 'year') {
    const year = today.getFullYear();
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  const start = addDays(today, -((today.getDay() - TUESDAY + 7) % 7));
  return { from: toDateKey(start), to: toDateKey(addDays(start, 6)) };
}

function inclusiveDays(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return (utc(to) - utc(from)) / msPerDay + 1;
}

/**
 * Mensagem para o intervalo digitado, ou `null` se a API o aceita.
 *
 * @example rangeError({ from: '2026-09-30', to: '2026-09-01' }) // 'A data final ...'
 */
export function rangeError({ from, to }: DateRange): string | null {
  const start = parseDateKey(from);
  const end = parseDateKey(to);
  if (!start || !end)
    return `Datas inválidas: de "${from}" até "${to}"; use o formato AAAA-MM-DD.`;
  if (end < start)
    return `A data final (${to}) não pode ser antes da inicial (${from}).`;
  if (inclusiveDays(start, end) > MAX_PERIOD_DAYS)
    return `Período de mais de ${MAX_PERIOD_DAYS} dias: escolha um intervalo menor.`;
  return null;
}
