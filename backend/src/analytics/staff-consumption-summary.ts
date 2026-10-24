import { toCents } from '../common/money.js';
import type { OrderEntry } from '../orders/order-pricing.js';
import {
  consumptionCost,
  sumConsumptionCosts,
  type ConsumptionCost,
  type ConsumptionTotals,
} from '../staff-consumption/consumption-cost.js';
import type { AnalyticsStaffConsumptionRow } from './analytics-source.js';

/** O consumo de uma pessoa no período (nome com a grafia mais recente). */
export interface PersonConsumption extends ConsumptionTotals {
  name: string;
}

export interface ConsumedItem {
  name: string;
  categoryName: string;
  quantity: number;
}

/** Bloco "Consumo interno" da Análise (2026-10-23): o total, por pessoa e os itens. */
export interface StaffConsumptionSummary extends ConsumptionTotals {
  byPerson: PersonConsumption[];
  topItems: ConsumedItem[];
}

/** Custos de cada pessoa pela chave do nome, guardando a grafia do lançamento mais recente. */
function costsByPerson(
  rows: AnalyticsStaffConsumptionRow[],
): Map<string, { name: string; costs: ConsumptionCost[] }> {
  const people = new Map<string, { name: string; costs: ConsumptionCost[] }>();
  for (const row of rows) {
    const costs = people.get(row.consumerKey)?.costs ?? [];
    const cost = consumptionCost(row.items);
    people.set(row.consumerKey, {
      name: row.consumerName,
      costs: [...costs, cost],
    });
  }
  return people;
}

function rankPeople(rows: AnalyticsStaffConsumptionRow[]): PersonConsumption[] {
  return [...costsByPerson(rows).values()]
    .map(({ name, costs }) => ({ name, ...sumConsumptionCosts(costs) }))
    .sort(
      (a, b) => toCents(b.cmvTotal) - toCents(a.cmvTotal) || b.count - a.count,
    );
}

/** Itens (sem os adicionais) por quantidade, com nome e categoria da época. */
function rankItems(entries: OrderEntry[], limit: number): ConsumedItem[] {
  const items = new Map<string, ConsumedItem>();
  for (const { productName: name, categoryName, quantity } of entries) {
    const key = `${categoryName}|${name}`;
    const before = items.get(key)?.quantity ?? 0;
    items.set(key, { name, categoryName, quantity: before + quantity });
  }
  return [...items.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

/**
 * Consumo interno do período (função pura, centavos): custo total, por pessoa do maior custo ao
 * menor e os itens mais consumidos.
 *
 * @example staffConsumptionSummary(rows, 10).byPerson[0] // { name: 'Bianca', count: 2, cmvTotal: '21.00', missingCostCount: 0 }
 */
export function staffConsumptionSummary(
  rows: AnalyticsStaffConsumptionRow[],
  limit: number,
): StaffConsumptionSummary {
  const totals = sumConsumptionCosts(rows.map((r) => consumptionCost(r.items)));
  return {
    ...totals,
    byPerson: rankPeople(rows),
    topItems: rankItems(
      rows.flatMap((r) => r.items),
      limit,
    ),
  };
}
