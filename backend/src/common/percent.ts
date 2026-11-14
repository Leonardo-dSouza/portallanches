import { BadRequestException } from '@nestjs/common';
import { normalizeDecimal } from './quantity.js';

const PERCENT_DECIMALS = 2;

/**
 * Valida um percentual de 0 a 100 com até 2 casas e devolve string normalizada, sem float.
 * Aceita número ou texto (`16`, `41.07`, `"16"`). Rejeita negativo, vírgula e 3+ casas.
 *
 * @example parsePercent('41.07', 'fixedCostPercent') // '41.07'
 */
export function parsePercent(raw: unknown, field: string): string {
  const normalized = normalizeDecimal(raw, PERCENT_DECIMALS);
  if (normalized === null) throw invalidPercent(field, raw);
  const value = Number(normalized);
  if (value < 0 || value > 100) throw invalidPercent(field, raw);
  return normalized;
}

function invalidPercent(field: string, raw: unknown): BadRequestException {
  return new BadRequestException(
    `Campo "${field}" inválido: recebido ${JSON.stringify(raw)}, esperado número de 0 a 100 com até ${PERCENT_DECIMALS} casas decimais (ex.: 41.07)`,
  );
}
