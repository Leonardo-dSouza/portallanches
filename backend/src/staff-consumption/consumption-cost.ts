import { formatCents, toCents } from '../common/money.js';
import { flattenEntries } from '../orders/order-item-tree.js';
import type { OrderEntry, OrderLine } from '../orders/order-pricing.js';

/**
 * Quanto o consumo custou à casa (CMV da época) e quantos itens ficaram sem custo (açaí, que não
 * tem composição): o fechamento mostra os dois (decisão do usuário, 2026-10-23).
 */
export interface ConsumptionCost {
  cmvTotal: string;
  missingCostCount: number;
}

const lineCmvCents = (line: OrderLine): number =>
  line.unitCmv === null ? 0 : toCents(line.unitCmv) * line.quantity;

const hasMissingCost = (entry: OrderEntry): boolean =>
  [entry, ...entry.addons].some((line) => line.unitCmv === null);

/**
 * CMV somado em centavos (adicionais inclusos) e as unidades de item sem custo (o item conta
 * uma vez com os adicionais: "Açaí 500 + LC + LP" = 1).
 *
 * @example consumptionCost(entries) // { cmvTotal: '11.30', missingCostCount: 0 }
 */
export function consumptionCost(entries: OrderEntry[]): ConsumptionCost {
  const cents = flattenEntries(entries).reduce(
    (sum, line) => sum + lineCmvCents(line),
    0,
  );
  const missingCostCount = entries
    .filter(hasMissingCost)
    .reduce((sum, entry) => sum + entry.quantity, 0);
  return { cmvTotal: formatCents(cents), missingCostCount };
}
