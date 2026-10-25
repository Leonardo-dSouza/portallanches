import type { ConsumptionCost } from '../api/staff-consumption-types';

/**
 * O custo do consumo quando a API mandou (só para o admin, 2026-10-25); null para o caixa. A tela
 * mostra o custo pelo que veio, sem conferir o perfil.
 *
 * @example costOf({ count: 2 }) // null
 */
export function costOf(
  value: Partial<ConsumptionCost>,
): ConsumptionCost | null {
  const { cmvTotal, missingCostCount } = value;
  if (cmvTotal === undefined || missingCostCount === undefined) return null;
  return { cmvTotal, missingCostCount };
}
