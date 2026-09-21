const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Data local como `YYYY-MM-DD`. Não usa `toISOString`: em UTC, depois das 21h no
 * Brasil ela já devolveria o dia seguinte.
 *
 * @example toDateKey(new Date(2026, 8, 22)) // '2026-09-22'
 */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Lê `YYYY-MM-DD` como data local; devolve `null` se vazio ou inexistente (ex.: 2026-02-30).
 *
 * @example parseDateKey('2026-09-22')?.getDate() // 22
 */
export function parseDateKey(key: string): Date | null {
  const match = DATE_KEY.exec(key);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return toDateKey(date) === key ? date : null;
}

/** Soma dias corridos em data local (funciona na virada de mês e de ano). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** @example formatDayLabel('2026-09-22') // 'ter 22/09' */
export function formatDayLabel(key: string): string {
  const date = parseDateKey(key);
  if (!date) return key;
  const label = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  return `${WEEKDAYS[date.getDay()]} ${label}`;
}
