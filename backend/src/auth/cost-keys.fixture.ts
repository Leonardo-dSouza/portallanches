/**
 * Campos de custo que o caixa nunca recebe pela API (2026-10-25). O `totalCost` do motoboy fica
 * de fora: é o que a casa paga ao entregador, não o custo do cardápio.
 */
const COST_KEYS = new Set([
  'cmv',
  'cmvComplete',
  'cmvPercent',
  'cmvTotal',
  'missingCostCount',
  'unitCmv',
  'unitCost',
]);

/**
 * Os campos de custo achados em qualquer nível da resposta (vazio = nada vaza).
 *
 * @example costKeysIn({ items: [{ unitCmv: '3.10' }] }) // ['unitCmv']
 */
export function costKeysIn(value: unknown): string[] {
  const found = new Set<string>();
  JSON.stringify(value, (key: string, nested: unknown) => {
    if (COST_KEYS.has(key)) found.add(key);
    return nested;
  });
  return [...found];
}
