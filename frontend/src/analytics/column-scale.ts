import { formatMoney } from '../api/money';

// Passos "redondos" dentro de cada potência de 10: o topo do eixo fica perto do maior valor.
const NICE_STEPS: readonly number[] = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/**
 * Topo do eixo: o menor número redondo maior ou igual a `max` (1 quando não há valor).
 *
 * @example niceCeiling(1210.5) // 1500
 */
export function niceCeiling(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = NICE_STEPS.find((candidate) => candidate * magnitude >= max);
  return (step ?? 10) * magnitude;
}

/** @example formatTick(1500) // 'R$ 1.500' */
export function formatTick(reais: number): string {
  return formatMoney(reais.toFixed(2)).replace(/,00$/, '');
}
