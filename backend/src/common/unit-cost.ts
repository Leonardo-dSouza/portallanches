import { BadRequestException } from '@nestjs/common';
import { normalizeDecimal } from './quantity.js';

// 4 casas porque o custo é por unidade de contagem: R$ 39,90/kg de queijo ÷ 1000 g
// ou R$ 0,0833 por sachê (caixa de 120 a R$ 10,00) perderiam precisão com 2 casas.
const UNIT_COST_DECIMALS = 4;

/**
 * Valida o custo de um insumo por unidade de contagem (R$, até 4 casas) e o devolve
 * como texto normalizado, sem passar por float. Zero é aceito (item sem custo, ex.: brinde).
 *
 * @example parseUnitCost('39.90', 'unitCost') // '39.9'
 */
export function parseUnitCost(raw: unknown, field: string): string {
  const normalized = normalizeDecimal(raw, UNIT_COST_DECIMALS);
  if (normalized !== null) return normalized;
  throw new BadRequestException(
    `Custo inválido em "${field}": recebido ${JSON.stringify(raw)}, esperado número não negativo com até ${UNIT_COST_DECIMALS} casas decimais (ex.: 39.9)`,
  );
}
