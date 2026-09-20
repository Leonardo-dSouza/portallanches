import type { ClosingRecord } from '../closing/closing-repository.js';

export const CLOSING_LOOKUP = Symbol('CLOSING_LOOKUP');

/** O que pedidos precisam do módulo de fechamento (implementado por `ClosingService`). */
export interface ClosingLookup {
  getOrCreateToday(): Promise<ClosingRecord>;
  getByDate(rawDate: string): Promise<ClosingRecord>;
}
