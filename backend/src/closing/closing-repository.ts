import type { DayGroup } from './business-date.js';
import type { DrawerToCountItem } from '../report/drawer-check.js';
import type {
  DrawerCountItemInput,
  KnownPaymentMethod,
} from './drawer-count-input.js';

export const CLOSING_REPOSITORY = Symbol('CLOSING_REPOSITORY');

export type ClosingStatus = 'OPEN' | 'CLOSED';

export interface DrawerClosingContext {
  toCount: DrawerToCountItem[];
  knownMethods: KnownPaymentMethod[];
}

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
  openingCash: string | null;
  openedById: number | null;
  openedAt: Date | null;
  countedById: number | null;
  countedAt: Date | null;
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
  /** Fechamentos com `from <= data <= to` (YYYY-MM-DD), em ordem crescente de data. */
  listBetween(from: string, to: string): Promise<ClosingRecord[]>;
  /** Diária vigente do grupo na data, ou null se nunca configurada. */
  findMotoboyRate(
    dayGroup: DayGroup,
    businessDate: string,
  ): Promise<string | null>;
  /** Cria o fechamento ou devolve o existente (seguro contra dois caixas simultâneos). */
  createIfAbsent(newClosing: NewClosing): Promise<ClosingRecord>;
  /** Grava o troco inicial da gaveta (2026-11-12). */
  recordOpening(
    id: number,
    amount: string,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord>;
  /**
   * Grava o troco só se a noite ainda não tiver um; null quando já tinha. O caixa abre uma vez:
   * dois aparelhos abrindo no mesmo segundo, o segundo perde (card 7).
   */
  recordFirstOpening(
    id: number,
    amount: string,
    userId: number,
    at: Date,
  ): Promise<ClosingRecord | null>;
  /**
   * Fecha o dia e, na mesma transação, conclui o andamento dos pedidos dele (todos viram
   * Entregue; decisão do usuário, 2026-10-10).
   */
  markClosed(id: number, userId: number, at: Date): Promise<ClosingRecord>;
  /** Fecha o dia com contagem na mesma transação (2026-11-12). */
  markClosedWithCount(
    id: number,
    userId: number,
    at: Date,
    counts: DrawerCountItemInput[],
    note: string | null,
  ): Promise<ClosingRecord>;
  markReopened(id: number, userId: number, at: Date): Promise<ClosingRecord>;
  /** Pedidos do dia ainda sem pagamento (conta aberta; os importados não contam). */
  listOpenOrders(closingId: number): Promise<OpenOrderRef[]>;
  /** Formas a contar e métodos conhecidos para conferência da gaveta (2026-11-12). */
  findDrawerCountContext(closingId: number): Promise<DrawerClosingContext>;
}
