import { seesCosts } from '../auth/cost-visibility.js';
import type { SessionUser } from '../auth/session-user.js';
import { entryViews, type OrderEntryView } from '../orders/order-view.js';
import type { ConsumptionCost } from './consumption-cost.js';
import type { StaffConsumptionView } from './staff-consumption.service.js';

/**
 * Consumo como sai pela API: itens sem o CMV (como no pedido) e o custo do lançamento só para o
 * admin (2026-10-25); o caixa recebe a lista sem os campos de custo.
 */
export type ConsumptionResponse<T extends StaffConsumptionView> = Omit<
  T,
  'items' | keyof ConsumptionCost
> &
  Partial<ConsumptionCost> & { items: OrderEntryView[] };

/**
 * @example consumptionFor(caixa, consumption).cmvTotal // undefined
 */
export function consumptionFor<T extends StaffConsumptionView>(
  user: SessionUser,
  consumption: T,
): ConsumptionResponse<T> {
  const { cmvTotal, missingCostCount, items, ...rest } = consumption;
  const view = { ...rest, items: entryViews(items) };
  if (!seesCosts(user)) return view;
  return { ...view, cmvTotal, missingCostCount };
}
