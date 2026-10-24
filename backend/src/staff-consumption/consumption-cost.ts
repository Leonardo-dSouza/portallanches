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

/** O consumo de um dia ou período: quantos lançamentos, o custo e os itens sem custo. */
export interface ConsumptionTotals extends ConsumptionCost {
  count: number;
}

/**
 * Soma os custos de vários lançamentos (centavos inteiros).
 *
 * @example sumConsumptionCosts([{ cmvTotal: '6.15', missingCostCount: 1 }]) // { count: 1, cmvTotal: '6.15', missingCostCount: 1 }
 */
export function sumConsumptionCosts(
  costs: ConsumptionCost[],
): ConsumptionTotals {
  const cents = costs.reduce((sum, c) => sum + toCents(c.cmvTotal), 0);
  const missingCostCount = costs.reduce(
    (sum, c) => sum + c.missingCostCount,
    0,
  );
  return {
    count: costs.length,
    cmvTotal: formatCents(cents),
    missingCostCount,
  };
}
