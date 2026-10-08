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
 * `?dia=` da URL do Histórico (0 = domingo … 6 = sábado); ausente ou inválido = todos os dias.
 *
 * @example parseWeekdayParam('4') // 4
 */
export function parseWeekdayParam(raw: string | null): number | null {
  return raw !== null && /^[0-6]$/.test(raw) ? Number(raw) : null;
}

/**
 * Link para o Histórico já no período (e no dia da semana, se houver).
 *
 * @example historyLink({ from: '2026-09-01', to: '2026-09-30' }, 4) // '/historico?de=2026-09-01&ate=2026-09-30&dia=4'
 */
export function historyLink(range: DateRange, weekday: number | null): string {
  const base = `/historico?de=${range.from}&ate=${range.to}`;
  return weekday === null ? base : `${base}&dia=${weekday}`;
}

/** @example weekdayTotalLabel(6) // 'Total dos sábados' */
export function weekdayTotalLabel(weekday: number): string {
  const { plural, masculine } = WEEKDAY_PLURALS[weekday];
  return `Total ${masculine ? 'dos' : 'das'} ${plural}`;
}

/** @example weekdayLinkLabel(5) // 'Ver as sextas no Histórico' */
export function weekdayLinkLabel(weekday: number): string {
  const { plural, masculine } = WEEKDAY_PLURALS[weekday];
  return `Ver ${masculine ? 'os' : 'as'} ${plural} no Histórico`;
}
