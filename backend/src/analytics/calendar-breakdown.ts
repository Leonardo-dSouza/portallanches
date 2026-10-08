import { formatCents } from '../common/money.js';
import { sumCents } from '../report/report-builder.js';
import type { ClosingOrderRow } from '../report/period-report-source.js';

export interface DaySales {
  businessDate: string;
  orders: number;
  revenue: string;
}

export interface WeekdaySales {
  /** 0 = domingo … 6 = sábado (como `Date.getUTCDay`). */
  weekday: number;
  /** Noites abertas (dias com fechamento) nesse dia da semana. */
  nights: number;
  orders: number;
  revenue: string;
  /** Médias por noite aberta: pedidos com 1 casa, faturamento ao centavo. */
  averageOrders: string;
  averageRevenue: string;
}

// Segunda a domingo, como no calendário da parede.
const WEEK_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

/**
 * Uma linha por dia com fechamento (inclusive os sem pedidos), na ordem das datas.
 *
 * @example dailySales(closings, orders)[0] // { businessDate: '2026-09-22', orders: 41, revenue: '1210.50' }
 */
export function dailySales(
  closings: { id: number; businessDate: string }[],
  orders: ClosingOrderRow[],
): DaySales[] {
  return closings.map((closing) => {
    const own = orders.filter((o) => o.closingId === closing.id);
    return {
      businessDate: closing.businessDate,
      orders: own.length,
      revenue: formatCents(sumCents(own.map((o) => o.amount))),
    };
  });
}

const weekdayOf = (businessDate: string): number =>
  new Date(`${businessDate}T00:00:00Z`).getUTCDay();

function weekdayTotals(weekday: number, days: DaySales[]): WeekdaySales {
  const orders = days.reduce((sum, day) => sum + day.orders, 0);
  const cents = sumCents(days.map((day) => day.revenue));
  return {
    weekday,
    nights: days.length,
    orders,
    revenue: formatCents(cents),
    averageOrders: (orders / days.length).toFixed(1),
    averageRevenue: formatCents(Math.round(cents / days.length)),
  };
}

/**
 * Dias da semana com pelo menos uma noite aberta, de segunda a domingo: mostra qual noite
 * vende mais (a média por noite não pune o dia que abriu menos vezes no período).
 *
 * @example weekdaySales(dailySales(closings, orders))[0].averageRevenue // '980.00'
 */
export function weekdaySales(days: DaySales[]): WeekdaySales[] {
  return WEEK_ORDER.flatMap((weekday) => {
    const own = days.filter((day) => weekdayOf(day.businessDate) === weekday);
    return own.length ? [weekdayTotals(weekday, own)] : [];
  });
}
