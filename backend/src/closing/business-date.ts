import { BadRequestException } from '@nestjs/common';

export type DayGroup = 'TUE_THU' | 'FRI_SUN';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONDAY = 1;
const TUE_THU_DAYS: readonly number[] = [2, 3, 4];

/**
 * Data de negócio (`YYYY-MM-DD`) no fuso local do servidor.
 *
 * @example toBusinessDate(new Date(2026, 8, 22)) // '2026-09-22'
 */
export function toBusinessDate(moment: Date): string {
  const month = String(moment.getMonth() + 1).padStart(2, '0');
  const day = String(moment.getDate()).padStart(2, '0');
  return `${moment.getFullYear()}-${month}-${day}`;
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

/** A lanchonete fecha na segunda-feira: não existe fechamento nesse dia. */
export function assertOperatingDay(businessDate: string): void {
  if (weekdayOf(businessDate) !== MONDAY) return;
  throw new BadRequestException(
    `A lanchonete não abre na segunda-feira: ${businessDate} não tem fechamento (esperado ter, qua, qui, sex, sáb ou dom)`,
  );
}

/** Grupo da diária do motoboy: terça a quinta ou sexta a domingo. */
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
