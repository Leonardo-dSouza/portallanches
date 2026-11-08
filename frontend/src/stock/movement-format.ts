import { formatQuantity } from '../api/quantity';

const MOVEMENT_DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/**
 * Data e hora do movimento no fuso da lanchonete (Brasília).
 *
 * @example formatMovementDateTime('2026-11-05T23:15:00Z') // '05/11/2026 20:15'
 */
export function formatMovementDateTime(iso: string): string {
  return MOVEMENT_DATE_TIME.format(new Date(iso)).replace(', ', ' ');
}

/**
 * Formata quantidade de movimento sempre com sinal explícito (+ ou −).
 *
 * @example formatMovementQuantity('10') // '+10'
 * @example formatMovementQuantity('-2.5') // '-2,5'
 */
export function formatMovementQuantity(quantity: string): string {
  if (quantity === '0') return '0';
  if (quantity.startsWith('-')) return `-${formatQuantity(quantity.slice(1))}`;
  return `+${formatQuantity(quantity)}`;
}

/**
 * Formata o ajuste de contagem do período (+ para sobra, − para baixa, 0 para estável).
 *
 * @example formatAdjustedQuantity('-1.5') // '-1,5'
 */
export function formatAdjustedQuantity(quantity: string): string {
  return formatMovementQuantity(quantity);
}
