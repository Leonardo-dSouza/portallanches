import { formatQuantity } from '../api/quantity';
import type { StockItem, StockLastCount } from '../api/types';
import { formatDate, parseDateKey, toDateKey } from '../history/date-keys';

export type AlertTone = 'danger' | 'warning';

export interface StockAlert {
  label: string;
  tone: AlertTone;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dias corridos de `from` até `to` (datas `YYYY-MM-DD`). */
function daysBetween(from: string, to: string): number {
  const start = parseDateKey(from)?.getTime() ?? 0;
  const end = parseDateKey(to)?.getTime() ?? 0;
  return Math.round((end - start) / DAY_MS);
}

/** "vence hoje", "vence amanhã" ou "vence em 5 dias (30/09)". */
export function expiryLabel(expiresOn: string, today: string): string {
  const days = daysBetween(today, expiresOn);
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return `Vence em ${days} dias (${formatDate(expiresOn).slice(0, 5)})`;
}

/**
 * Alertas de um insumo, do mais grave para o mais brando.
 *
 * @example alertsOf(item, '2026-09-25') // [{ label: 'Vence amanhã', tone: 'warning' }]
 */
export function alertsOf(item: StockItem, today: string): StockAlert[] {
  const { flags, nextExpiry, minStock, countUnit } = item;
  const alerts: StockAlert[] = [];
  if (flags.expired && nextExpiry)
    alerts.push({
      label: `Vencido em ${formatDate(nextExpiry).slice(0, 5)}`,
      tone: 'danger',
    });
  if (flags.belowMin && minStock !== null)
    alerts.push({
      label: `Abaixo do mínimo (${formatQuantity(minStock)} ${countUnit})`,
      tone: 'danger',
    });
  if (flags.expiringSoon && nextExpiry)
    alerts.push({ label: expiryLabel(nextExpiry, today), tone: 'warning' });
  if (flags.needsPurchase)
    alerts.push({ label: 'Precisa comprar', tone: 'warning' });
  if (flags.countDue) alerts.push({ label: 'Contar hoje', tone: 'warning' });
  return alerts;
}

export const isCritical = (item: StockItem): boolean =>
  Object.values(item.flags).some(Boolean);

/**
 * Última contagem em uma linha.
 *
 * @example describeLastCount({ status: 'COUNTED', quantity: '8', countedAt: '2026-09-25T23:00:00Z' }, 'un') // '8 un em 25/09'
 */
export function describeLastCount(
  count: StockLastCount | null,
  countUnit: string,
): string {
  if (!count) return 'Nunca contado';
  const day = formatDate(toDateKey(new Date(count.countedAt))).slice(0, 5);
  if (count.status === 'NOT_COUNTED') return `Não contado em ${day}`;
  if (count.status === 'NEEDS_PURCHASE') return `"Precisa comprar" em ${day}`;
  return `${formatQuantity(count.quantity ?? '0')} ${countUnit} em ${day}`;
}
