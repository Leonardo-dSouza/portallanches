import type { DayGroup } from './business-date.js';

export const CLOSING_REPOSITORY = Symbol('CLOSING_REPOSITORY');

export type ClosingStatus = 'OPEN' | 'CLOSED';

/** Fechamento diário como a aplicação o enxerga (datas em `YYYY-MM-DD`, dinheiro em string). */
export interface ClosingRecord {
  id: number;
  businessDate: string;
  status: ClosingStatus;
  motoboyDailyRate: string;
  closedById: number | null;
  closedAt: Date | null;
  reopenedById: number | null;
  reopenedAt: Date | null;
  notes: string | null;
}

export interface NewClosing {
  businessDate: string;
  motoboyDailyRate: string;
}

/** Conta aberta no balcão (sem pagamento), como o caixa a reconhece: número e nome. */
export interface OpenOrderRef {
  dayNumber: number;
  customerName: string | null;
}

export interface ClosingRepository {
  findByDate(businessDate: string): Promise<ClosingRecord | null>;
  findById(id: number): Promise<ClosingRecord | null>;
  list(): Promise<ClosingRecord[]>;
  /** Fechamento de data mais recente (aberto ou fechado), ou null se não houver nenhum. */
  findLatest(): Promise<ClosingRecord | null>;
  /** Fechamentos com `from <= data <= to` (YYYY-MM-DD), em ordem crescente de data. */
  listBetween(from: string, to: string): Promise<ClosingRecord[]>;
  /** Diária vigente do grupo na data, ou null se nunca configurada. */
  findMotoboyRate(
    dayGroup: DayGroup,
    businessDate: string,
  ): Promise<string | null>;
  /** Cria o fechamento ou devolve o existente (seguro contra dois caixas simultâneos). */
  createIfAbsent(newClosing: NewClosing): Promise<ClosingRecord>;
  /**
   * Fecha o dia e, na mesma transação, conclui o andamento dos pedidos dele (todos viram
   * Entregue; decisão do usuário, 2026-10-10).
   */
  markClosed(id: number, userId: number, at: Date): Promise<ClosingRecord>;
  markReopened(id: number, userId: number, at: Date): Promise<ClosingRecord>;
  /** Pedidos do dia ainda sem pagamento (conta aberta; os importados não contam). */
  listOpenOrders(closingId: number): Promise<OpenOrderRef[]>;
}
