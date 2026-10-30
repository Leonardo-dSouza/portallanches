import type { StaffConsumptionInput } from '../api/staff-consumption-types';
import { itemsRequestOf, NO_ITEMS_ERROR } from '../cash/item-request';
import type { DraftLine } from '../cash/order-lines';

export type ConsumptionRequestResult =
  { ok: true; request: StaffConsumptionInput } | { ok: false; error: string };

const NO_NAME_ERROR = 'Diga para quem é o consumo (ex.: Motoboy, Equipe)';

/**
 * Corpo do consumo interno: quem consumiu (obrigatório) e os itens como no pedido.
 *
 * @example buildConsumptionRequest('Bianca', lines) // { ok: true, request: { consumerName: 'Bianca', items } }
 */
export function buildConsumptionRequest(
  consumerName: string,
  lines: DraftLine[],
): ConsumptionRequestResult {
  const name = consumerName.trim();
  if (!name) return { ok: false, error: NO_NAME_ERROR };
  if (lines.length === 0) return { ok: false, error: NO_ITEMS_ERROR };
  return {
    ok: true,
    request: { consumerName: name, items: itemsRequestOf(lines) },
  };
}
