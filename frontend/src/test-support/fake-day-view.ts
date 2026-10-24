import { ApiError } from '../api/api-client';
import type { StaffConsumption } from '../api/staff-consumption-types';
import type { Expense, Order } from '../api/types';

/** O que a visão do dia lê do `FakeApiClient`. */
interface DayViewSource {
  daysWithoutClosing: string[];
  orders: Order[];
  expenses: Expense[];
  staffConsumptions: StaffConsumption[];
  report(): unknown;
}

/**
 * `GET /closings/:data/(orders|expenses|staff-consumptions|report)` do fake, como as rotas de
 * admin: o caixa daquele dia, ou 404 quando o dia não tem fechamento.
 *
 * @example fakeDayView(api, '2026-09-25', 'orders') // api.orders
 */
export function fakeDayView(
  source: DayViewSource,
  date: string,
  kind: string,
): unknown {
  if (source.daysWithoutClosing.includes(date))
    throw new ApiError(404, `Fechamento de ${date} não encontrado`);
  if (kind === 'orders') return source.orders;
  if (kind === 'expenses') return source.expenses;
  if (kind === 'staff-consumptions') return source.staffConsumptions;
  return source.report();
}
