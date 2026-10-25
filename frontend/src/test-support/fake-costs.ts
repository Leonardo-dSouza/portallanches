import type { UserRole } from '../api/types';

/** Campos de custo que o backend tira para o caixa (2026-10-25). */
const COST_KEYS: ReadonlySet<string> = new Set([
  'cmvTotal',
  'missingCostCount',
  'unitCost',
]);

/**
 * A linha como o backend manda para o perfil: inteira para o admin, sem os campos de custo para
 * o caixa (nem nulos).
 *
 * @example asSeenBy('CAIXA', { id: 1, unitCost: '4.50' }) // { id: 1 }
 */
export function asSeenBy<T extends object>(role: UserRole, row: T): T {
  if (role === 'ADMIN') return row;
  const kept = Object.entries(row).filter(([key]) => !COST_KEYS.has(key));
  return Object.fromEntries(kept) as T;
}
