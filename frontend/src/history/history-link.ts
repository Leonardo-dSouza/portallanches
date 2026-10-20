import type { DateRange } from '../api/types';

// Plural de cada dia (0 = domingo) e o artigo que concorda com ele.
const WEEKDAY_PLURALS: readonly { plural: string; masculine: boolean }[] = [
  { plural: 'domingos', masculine: true },
  { plural: 'segundas', masculine: false },
  { plural: 'terças', masculine: false },
  { plural: 'quartas', masculine: false },
  { plural: 'quintas', masculine: false },
  { plural: 'sextas', masculine: false },
  { plural: 'sábados', masculine: true },
];

/**
 * `?dia=` da aba Noites (0 = domingo … 6 = sábado); ausente ou inválido = todos os dias.
 *
 * @example parseWeekdayParam('4') // 4
 */
export function parseWeekdayParam(raw: string | null): number | null {
  return raw !== null && /^[0-6]$/.test(raw) ? Number(raw) : null;
}

/**
 * Análise de um dia só (o fechamento da noite, só para ler).
 *
 * @example dayAnalyticsLink('2026-09-22') // '/analise?de=2026-09-22&ate=2026-09-22'
 */
export function dayAnalyticsLink(businessDate: string): string {
  return `/analise?de=${businessDate}&ate=${businessDate}`;
}

/**
 * Link para a aba Noites da Análise (o antigo Histórico, 2026-10-11) já no período e no dia
 * da semana, se houver.
 *
 * @example nightsLink({ from: '2026-09-01', to: '2026-09-30' }, 4) // '/analise?aba=noites&de=2026-09-01&ate=2026-09-30&dia=4'
 */
export function nightsLink(range: DateRange, weekday: number | null): string {
  const base = `/analise?aba=noites&de=${range.from}&ate=${range.to}`;
  return weekday === null ? base : `${base}&dia=${weekday}`;
}

/** @example weekdayTotalLabel(6) // 'Total dos sábados' */
export function weekdayTotalLabel(weekday: number): string {
  const { plural, masculine } = WEEKDAY_PLURALS[weekday];
  return `Total ${masculine ? 'dos' : 'das'} ${plural}`;
}

/** @example weekdayLinkLabel(5) // 'Ver as sextas em Noites' */
export function weekdayLinkLabel(weekday: number): string {
  const { plural, masculine } = WEEKDAY_PLURALS[weekday];
  return `Ver ${masculine ? 'os' : 'as'} ${plural} em Noites`;
}
