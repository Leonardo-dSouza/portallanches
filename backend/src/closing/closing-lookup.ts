import type { ClosingRecord } from './closing-repository.js';

export const CLOSING_LOOKUP = Symbol('CLOSING_LOOKUP');

/** O que pedidos precisam do módulo de fechamento (implementado por `ClosingService`). */
export interface ClosingLookup {
  getOrCreateToday(): Promise<ClosingRecord>;
  getByDate(rawDate: string): Promise<ClosingRecord>;
}

export const CLOSING_RANGE_LOOKUP = Symbol('CLOSING_RANGE_LOOKUP');

/** O que relatórios de período precisam do módulo de fechamento. */
export interface ClosingRangeLookup {
  /** Valida o intervalo (YYYY-MM-DD, máx. 366 dias) e lista os fechamentos dele. */
  listBetween(
    rawFrom: string | undefined,
    rawTo: string | undefined,
  ): Promise<ClosingRecord[]>;
}
