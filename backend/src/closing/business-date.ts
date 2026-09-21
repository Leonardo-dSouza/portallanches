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

function weekdayOf(businessDate: string): number {
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
