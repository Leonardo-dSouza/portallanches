import { BadRequestException } from '@nestjs/common';

export type DayGroup = 'TUE_THU' | 'FRI_SUN';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TUE_THU_DAYS: readonly number[] = [2, 3, 4];

/** Fuso em que o "dia" da lanchonete vira à meia-noite (nunca o fuso da máquina do servidor). */
export const DEFAULT_BUSINESS_TIMEZONE = 'America/Sao_Paulo';

/**
 * Data de negócio (`YYYY-MM-DD`) de um instante, no fuso da lanchonete. Não usa o
 * fuso do servidor: em contêiner (UTC), 22h de domingo em Brasília já viraria segunda.
 *
 * @example toBusinessDate(new Date('2026-09-21T01:17:00Z'), 'America/Sao_Paulo') // '2026-09-20'
 */
export function toBusinessDate(
  moment: Date,
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(moment);
}

/**
 * Hora (0 a 23) de um instante no fuso da lanchonete, para a virada da madrugada.
 *
 * @example businessHour(new Date('2026-10-10T08:30:00Z'), 'America/Sao_Paulo') // 5
 */
export function businessHour(moment: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(moment);
  return Number(hour);
}

/**
 * Soma dias corridos a uma data `YYYY-MM-DD` (aceita negativos).
 *
 * @example shiftBusinessDate('2026-03-01', -1) // '2026-02-28'
 */
export function shiftBusinessDate(businessDate: string, days: number): string {
  const moment = new Date(`${businessDate}T00:00:00Z`);
  moment.setUTCDate(moment.getUTCDate() + days);
  return moment.toISOString().slice(0, 10);
}

/** Valida o formato `YYYY-MM-DD` de uma data vinda da rota e a devolve. */
export function parseBusinessDate(raw: string): string {
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (!ISO_DATE_PATTERN.test(raw) || Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(
      `Data inválida "${raw}": esperado o formato YYYY-MM-DD (ex.: 2026-09-22)`,
    );
  }
  return raw;
}

/**
 * Dia da semana de uma data `YYYY-MM-DD` (0 = domingo … 6 = sábado). Lê a data em UTC, então
 * não depende do fuso da máquina.
 *
 * @example weekdayOf('2026-09-22') // 2 (terça)
 */
export function weekdayOf(businessDate: string): number {
  return new Date(`${businessDate}T00:00:00Z`).getUTCDay();
}

/**
 * Grupo da diária do motoboy: terça a quinta ou sexta a domingo. Segunda (dia que a
 * lanchonete só abre em ocasiões especiais) usa o grupo de sexta a domingo.
 */
export function dayGroupOf(businessDate: string): DayGroup {
  return TUE_THU_DAYS.includes(weekdayOf(businessDate)) ? 'TUE_THU' : 'FRI_SUN';
}

const MAX_RANGE_DAYS = 366;
const MS_PER_DAY = 86_400_000;

function parseRangeBound(raw: string | undefined, name: string): string {
  if (raw !== undefined) return parseBusinessDate(raw);
  throw new BadRequestException(
    `Parâmetro "${name}" obrigatório: esperado uma data YYYY-MM-DD (ex.: ${name}=2026-09-01)`,
  );
}

/**
 * Valida o intervalo `from`..`to` (inclusivo) de uma consulta de período:
 * datas válidas, `from <= to` e no máximo 366 dias.
 *
 * @example parseDateRange('2026-09-01', '2026-09-30') // { from: '2026-09-01', to: '2026-09-30' }
 */
export function parseDateRange(
  rawFrom: string | undefined,
  rawTo: string | undefined,
): { from: string; to: string } {
  const from = parseRangeBound(rawFrom, 'from');
  const to = parseRangeBound(rawTo, 'to');
  const days =
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      MS_PER_DAY +
    1;
  if (days >= 1 && days <= MAX_RANGE_DAYS) return { from, to };
  throw new BadRequestException(
    `Intervalo inválido ${from}..${to}: esperado from <= to e no máximo ${MAX_RANGE_DAYS} dias (recebido ${days})`,
  );
}

/** `BUSINESS_TIMEZONE` do ambiente; fuso inválido derruba a subida em vez de errar datas depois. */
export function readBusinessTimeZone(): string {
  const timeZone = process.env.BUSINESS_TIMEZONE ?? DEFAULT_BUSINESS_TIMEZONE;
  try {
    toBusinessDate(new Date(), timeZone);
  } catch {
    throw new Error(
      `BUSINESS_TIMEZONE inválido "${timeZone}": esperado um fuso IANA (ex.: America/Sao_Paulo)`,
    );
  }
  return timeZone;
}

/**
 * Filtro opcional de dia da semana vindo da query (`?weekday=4`); ausente = todos os dias.
 *
 * @example parseWeekdayFilter('4') // 4 (quinta)
 */
export function parseWeekdayFilter(raw: string | undefined): number | null {
  if (raw === undefined || raw === '') return null;
  if (/^[0-6]$/.test(raw)) return Number(raw);
  throw new BadRequestException(
    `Parâmetro "weekday" inválido: recebido ${JSON.stringify(raw)}, esperado inteiro de 0 (domingo) a 6 (sábado)`,
  );
}
