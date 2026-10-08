import {
  addDays,
  formatDate,
  parseDateKey,
  toDateKey,
  weekdayName,
} from '../history/date-keys';

const MONTHS: readonly string[] = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const SHORT_WEEKDAYS: readonly string[] = [
  'dom',
  'seg',
  'ter',
  'qua',
  'qui',
  'sex',
  'sáb',
];

/** Mês mostrado no calendário (`month` de 0 a 11, como no `Date`). */
export interface MonthCursor {
  year: number;
  month: number;
}

/** As chaves vêm do próprio calendário ou de datas já validadas pela tela. */
function dateOf(key: string): Date {
  const date = parseDateKey(key);
  if (date) return date;
  throw new Error(`Data inválida "${key}": esperado AAAA-MM-DD`);
}

/** @example cursorOf('2026-10-07') // { year: 2026, month: 9 } */
export function cursorOf(key: string): MonthCursor {
  const date = dateOf(key);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** @example shiftMonth({ year: 2026, month: 0 }, -1) // { year: 2025, month: 11 } */
export function shiftMonth(cursor: MonthCursor, delta: number): MonthCursor {
  const first = new Date(cursor.year, cursor.month + delta, 1);
  return { year: first.getFullYear(), month: first.getMonth() };
}

/** @example monthTitle({ year: 2026, month: 9 }) // 'outubro de 2026' */
export function monthTitle(cursor: MonthCursor): string {
  return `${MONTHS[cursor.month]} de ${cursor.year}`;
}

export const isInMonth = (key: string, cursor: MonthCursor): boolean => {
  const own = cursorOf(key);
  return own.year === cursor.year && own.month === cursor.month;
};

/**
 * Semanas do mês, de domingo a sábado (como os calendários daqui), completadas com os dias
 * dos meses vizinhos.
 *
 * @example monthGrid({ year: 2026, month: 9 })[0][0] // '2026-09-27'
 */
export function monthGrid(cursor: MonthCursor): string[][] {
  const first = new Date(cursor.year, cursor.month, 1);
  const last = new Date(cursor.year, cursor.month + 1, 0);
  const end = addDays(last, 6 - last.getDay());
  const weeks: string[][] = [];
  for (let day = addDays(first, -first.getDay()); day <= end;) {
    const sunday = day;
    weeks.push(
      Array.from({ length: 7 }, (_, i) => toDateKey(addDays(sunday, i))),
    );
    day = addDays(day, 7);
  }
  return weeks;
}

/** @example formatShortDate('2026-10-07') // 'qua, 07/10/2026' */
export function formatShortDate(key: string): string {
  return `${SHORT_WEEKDAYS[dateOf(key).getDay()]}, ${formatDate(key)}`;
}

/** Nome do dia para o leitor de tela. @example dayLabel('2026-10-07') // 'quarta, 7 de outubro de 2026' */
export function dayLabel(key: string): string {
  const date = dateOf(key);
  const weekday = weekdayName(date.getDay()).toLowerCase();
  return `${weekday}, ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

/** Mesmo dia `delta` meses depois, sem passar do último dia do mês (31/01 → 28/02). */
function sameDayInMonth(date: Date, delta: number): Date {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + delta + 1, 0);
  const day = Math.min(date.getDate(), lastDay.getDate());
  return new Date(lastDay.getFullYear(), lastDay.getMonth(), day);
}

const DAY_STEPS: Readonly<Record<string, (date: Date) => number>> = {
  ArrowLeft: () => -1,
  ArrowRight: () => 1,
  ArrowUp: () => -7,
  ArrowDown: () => 7,
  Home: (date) => -date.getDay(),
  End: (date) => 6 - date.getDay(),
};

const MONTH_STEPS: Readonly<Record<string, number>> = {
  PageUp: -1,
  PageDown: 1,
};

/**
 * Para onde o foco vai com a tecla (setas: dia/semana; PageUp/PageDown: mês; Home/End:
 * domingo/sábado da semana); null quando a tecla não move.
 *
 * @example moveFocus('2026-01-31', 'PageDown') // '2026-02-28'
 */
export function moveFocus(key: string, keyName: string): string | null {
  const date = dateOf(key);
  const step = DAY_STEPS[keyName];
  if (step) return toDateKey(addDays(date, step(date)));
  const months = MONTH_STEPS[keyName];
  return months ? toDateKey(sameDayInMonth(date, months)) : null;
}
