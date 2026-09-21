import type { SessionUser } from '../auth/session-user.js';
import type { ClosingRecord } from './closing-repository.js';

export const CLOSING_LOOKUP = Symbol('CLOSING_LOOKUP');

/** O que pedidos precisam do módulo de fechamento (implementado por `ClosingService`). */
export interface ClosingLookup {
  /**
   * Fechamento da data escolhida (sem data = hoje) para consulta. Se o dia ainda não
   * tem lançamentos devolve um fechamento vazio (`id` 0) sem gravar nada.
   */
  getFor(user: SessionUser, rawDate?: string): Promise<ClosingRecord>;
  /** Como `getFor`, mas cria o fechamento (com a diária vigente) se ainda não existir. */
  getOrCreateFor(user: SessionUser, rawDate?: string): Promise<ClosingRecord>;
  getById(id: number): Promise<ClosingRecord>;
  /** Lança 403 se o usuário não pode lançar/editar nesse fechamento. */
  assertEditable(user: SessionUser, closing: ClosingRecord): void;
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
