import { ApiError } from '../api/api-client';
import type { Expense, Order } from '../api/types';

/** O que a visão do dia lê do `FakeApiClient`. */
interface DayViewSource {
  daysWithoutClosing: string[];
  orders: Order[];
  expenses: Expense[];
  report(): unknown;
}

/**
 * `GET /closings/:data/(orders|expenses|report)` do fake, como as rotas de admin: os pedidos,
 * gastos e relatório do caixa daquele dia, ou 404 quando o dia não tem fechamento.
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
  return source.report();
}
