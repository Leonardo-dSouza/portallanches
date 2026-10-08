import { shiftBusinessDate } from '../closing/business-date.js';

const MS_PER_DAY = 86_400_000;

const lastDayOfMonth = (year: number, month: number): string =>
  new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

/** Do dia 1 ao último dia do mesmo mês. */
function isFullMonth(from: string, to: string): boolean {
  const [year, month] = from.split('-').map(Number);
  return from.endsWith('-01') && to === lastDayOfMonth(year, month);
}

// Um dia só compara com o mesmo dia da semana anterior: o dia de antes pode ser a segunda
// de folga, e sexta com quinta não diz nada sobre a sexta.
const DAYS_IN_WEEK = 7;

/**
 * Período de comparação: um dia → o mesmo dia da semana anterior; mês cheio → mês anterior
 * inteiro; ano cheio → ano anterior; qualquer outro → o mesmo número de dias logo antes.
 *
 * @example previousRange('2026-09-21', '2026-09-27') // { from: '2026-09-14', to: '2026-09-20' }
 */
export function previousRange(
  from: string,
  to: string,
): { from: string; to: string } {
  if (from === to) {
    const sameWeekday = shiftBusinessDate(from, -DAYS_IN_WEEK);
    return { from: sameWeekday, to: sameWeekday };
  }
  const year = Number(from.slice(0, 4));
  if (from === `${year}-01-01` && to === `${year}-12-31`)
    return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
  if (isFullMonth(from, to)) {
    const previousTo = shiftBusinessDate(from, -1);
    return { from: `${previousTo.slice(0, 7)}-01`, to: previousTo };
  }
  const days = (Date.parse(to) - Date.parse(from)) / MS_PER_DAY + 1;
  return {
    from: shiftBusinessDate(from, -days),
    to: shiftBusinessDate(from, -1),
  };
}
