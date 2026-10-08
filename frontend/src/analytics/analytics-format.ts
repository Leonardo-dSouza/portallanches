import type { PercentChange } from '../api/analytics-types';
import type { DateRange } from '../api/types';
import { formatDate, formatDateWithWeekday } from '../history/date-keys';

export { weekdayName } from '../history/date-keys';

export type ChangeDirection = 'up' | 'down' | 'flat';

export interface ChangeLabel {
  /** Sem sinal: a direção vai na seta e no texto para leitor de tela. */
  text: string;
  direction: ChangeDirection;
}

/** @example formatDecimal('8.8') // '8,8' */
export const formatDecimal = (value: string): string => value.replace('.', ',');

/**
 * Variação da API ('12.5', '-3.0') para o visor; null = sem período anterior para comparar.
 *
 * @example describeChange('-3.0') // { text: '3,0%', direction: 'down' }
 */
export function describeChange(change: PercentChange): ChangeLabel | null {
  if (change === null) return null;
  const value = Number(change);
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  return { text: `${formatDecimal(change.replace('-', ''))}%`, direction };
}

/**
 * Largura da barra em relação à maior da lista (só desenho: os números vêm prontos da API).
 *
 * @example barShare(25, 100) // '25%'
 */
export function barShare(value: number, max: number): string {
  if (max <= 0) return '0%';
  return `${Math.round((value / max) * 100)}%`;
}

/** Reais da API ('35.60') como número, só para o tamanho da barra (nunca para somar). */
export const moneyBar = (money: string): number => Number(money);

/** @example describeRange({ from: '2026-09-22', to: '2026-09-28' }) // '22/09/2026 a 28/09/2026' */
export function describeRange(range: DateRange): string {
  if (range.from === range.to) return formatDateWithWeekday(range.from);
  return `${formatDate(range.from)} a ${formatDate(range.to)}`;
}

/**
 * A frase que diz o que está sendo comparado. Período em andamento conta só até hoje e
 * compara com o mesmo trecho de antes (outubro até o dia 8 contra setembro até o dia 8).
 *
 * @example describeComparison(report) // 'Comparado com 01/08/2026 a 31/08/2026'
 */
export function describeComparison(
  report: DateRange & { elapsedTo: string; previous: DateRange },
): string {
  const previous = describeRange(report.previous);
  if (report.elapsedTo === report.to) return `Comparado com ${previous}`;
  const elapsed = describeRange({ from: report.from, to: report.elapsedTo });
  return `Até hoje (${elapsed}), comparado com o mesmo trecho antes: ${previous}`;
}

/** @example countLabel(1, 'entrega', 'entregas') // '1 entrega' */
export function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
