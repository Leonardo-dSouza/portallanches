import type { OrderItem, OrderItemInput } from './order-types';
import type { Money, StockShortfall } from './types';

/** Custo do consumo interno (CMV da época) e os itens sem custo (açaí, sem composição). */
export interface ConsumptionCost {
  cmvTotal: Money;
  missingCostCount: number;
}

export interface ConsumptionCount {
  count: number;
}

/** Consumo de um dia ou período: quantos lançamentos, o custo e os itens sem custo. */
export interface ConsumptionTotals extends ConsumptionCount, ConsumptionCost {}

/**
 * Consumo interno (pedido do usuário, 2026-10-20): item do cardápio que a equipe consumiu.
 * Fora das vendas; vale pelo custo, à parte dos gastos. O custo só vem para o admin
 * (2026-10-25): para o caixa a API não manda os campos.
 */
export interface StaffConsumption extends Partial<ConsumptionCost> {
  id: number;
  closingId: number;
  createdById: number;
  createdAt: string;
  consumerName: string;
  items: OrderItem[];
}

/** Resposta de lançar ou editar: o aviso de saldo e se o dia é a noite em andamento (imprime). */
export interface SavedStaffConsumption extends StaffConsumption {
  stockShortfalls: StockShortfall[];
  live: boolean;
}

export interface StaffConsumptionInput {
  consumerName: string;
  items: OrderItemInput[];
}

/** O consumo de uma pessoa no período (nome com a grafia mais recente). */
export interface PersonConsumption extends ConsumptionTotals {
  name: string;
}

export interface ConsumedItem {
  name: string;
  categoryName: string;
  quantity: number;
}

/** Bloco "Consumo interno" da Análise do período: o total, por pessoa e os itens. */
export interface StaffConsumptionSummary extends ConsumptionTotals {
  byPerson: PersonConsumption[];
  topItems: ConsumedItem[];
}
