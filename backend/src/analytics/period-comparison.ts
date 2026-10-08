import { shiftBusinessDate } from '../closing/business-date.js';

const MS_PER_DAY = 86_400_000;

// Um dia só compara com o mesmo dia da semana anterior: o dia de antes pode ser a segunda
// de folga, e sexta com quinta não diz nada sobre a sexta.
const DAYS_IN_WEEK = 7;

export interface Comparison {
  /** Último dia que entra no período: `to`, ou hoje se o período ainda está em andamento. */
  elapsedTo: string;
  previous: { from: string; to: string };
}

const pad = (value: number): string => String(value).padStart(2, '0');

const lastDayOfMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Dia `day` do mês, sem passar do último (31 em fevereiro vira 28 ou 29). */
function clampedDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(Math.min(day, lastDayOfMonth(year, month)))}`;
}

const datePartsOf = (date: string): number[] => date.split('-').map(Number);

/** Do dia 1 ao último dia do mesmo mês. */
function isFullMonth(from: string, to: string): boolean {
  const [year, month] = datePartsOf(from);
  return from.endsWith('-01') && to === clampedDate(year, month, 31);
}

const isFullYear = (from: string, to: string): boolean =>
  from.endsWith('-01-01') && to === `${from.slice(0, 4)}-12-31`;

/**
 * Mês anterior, do dia 1 até o mesmo dia de `elapsedTo` (limitado ao fim daquele mês); mês
 * completo compara com o anterior inteiro (setembro, de 30 dias, contra agosto até o 31).
 */
function previousMonth(
  from: string,
  elapsedTo: string,
  complete: boolean,
): Comparison['previous'] {
  const [year, month] = datePartsOf(shiftBusinessDate(from, -1));
  const day = complete ? 31 : datePartsOf(elapsedTo)[2];
  return {
    from: `${year}-${pad(month)}-01`,
    to: clampedDate(year, month, day),
  };
}

/** Ano anterior, de 1º de janeiro até o mesmo dia e mês de `elapsedTo`. */
function previousYear(from: string, elapsedTo: string): Comparison['previous'] {
  const year = Number(from.slice(0, 4)) - 1;
  const [, month, day] = datePartsOf(elapsedTo);
  return { from: `${year}-01-01`, to: clampedDate(year, month, day) };
}

function previousOf(
  from: string,
  to: string,
  elapsedTo: string,
): Comparison['previous'] {
  if (from === to) {
    const sameWeekday = shiftBusinessDate(from, -DAYS_IN_WEEK);
    return { from: sameWeekday, to: sameWeekday };
  }
  if (isFullYear(from, to)) return previousYear(from, elapsedTo);
  if (isFullMonth(from, to))
    return previousMonth(from, elapsedTo, elapsedTo === to);
  const days = (Date.parse(to) - Date.parse(from)) / MS_PER_DAY + 1;
  return {
    from: shiftBusinessDate(from, -days),
    to: shiftBusinessDate(elapsedTo, -days),
  };
}

/**
 * O trecho já decorrido do período e o trecho equivalente de antes, para a comparação ser
 * justa (pedido do usuário em 2026-10-08): outubro até o dia 8 contra setembro até o dia 8.
 * Um dia → o mesmo dia da semana anterior; mês cheio → mês anterior; ano cheio → ano anterior;
 * outro intervalo → recua o tamanho dele. Período já terminado (ou todo no futuro) não é cortado.
 *
 * @example comparisonRanges('2026-10-01', '2026-10-31', '2026-10-08') // { elapsedTo: '2026-10-08', previous: { from: '2026-09-01', to: '2026-09-08' } }
 */
export function comparisonRanges(
  from: string,
  to: string,
  today: string,
): Comparison {
  const inProgress = from <= today && today < to;
  const elapsedTo = inProgress ? today : to;
  return { elapsedTo, previous: previousOf(from, to, elapsedTo) };
}
