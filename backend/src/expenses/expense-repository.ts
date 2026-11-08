import type { NfceInvoice } from '../nfce/nfce-invoice.js';
import type {
  ExpenseEventInput,
  ExpenseEventRecord,
} from './expense-events.js';

export const EXPENSE_REPOSITORY = Symbol('EXPENSE_REPOSITORY');

export interface ExpenseData {
  expenseTypeId: number;
  description: string | null;
  amount: string;
}

/** Resumo da nota presa ao gasto, para a lista (o detalhe com os itens vem à parte). */
export interface ExpenseInvoiceSummary {
  id: number;
  /** Apelido do mercado ou, sem apelido, a razão social. */
  vendorName: string;
  issuedAt: string;
  itemCount: number;
  /** Itens fora da lanchonete (2026-10-25), para o selo "20 itens · 3 fora". */
  outsideItemCount: number;
  /** Soma das linhas de fora, para a dica do Valor na edição ("fora: R$ 14,67"). */
  outsideTotal: string;
  amountDue: string;
  paymentLabel?: string | null;
}

export interface ExpenseRecord extends ExpenseData {
  id: number;
  closingId: number;
  createdById: number;
  invoice: ExpenseInvoiceSummary | null;
  canceledAt: Date | null;
  canceledById: number | null;
  /** Desconto da nota para validação interna ao manter a nota na edição. */
  invoiceDiscount?: string;
  /** Linhas da nota para validação da faixa de desconto ao manter a nota na edição. */
  invoiceItems?: {
    position: number;
    total: string;
    outsideBusiness: boolean;
  }[];
}

/** Nota lida para prender ao gasto, com as posições dos itens fora da lanchonete e o desconto da lanchonete. */
export interface AttachedInvoice {
  invoice: NfceInvoice;
  outsidePositions: number[];
  businessDiscount: string;
}

/**
 * O que acontece com a nota do gasto ao salvar a edição. Na nota mantida, `outsidePositions`
 * troca as marcas e `businessDiscount` troca a divisão do desconto; ausente, ficam as de antes.
 */
export type ExpenseInvoiceChange =
  | { kind: 'keep'; outsidePositions?: number[]; businessDiscount?: string }
  | { kind: 'remove' }
  | ({ kind: 'attach' } & AttachedInvoice);

export interface ExpenseRepository {
  /** Grava o gasto e, se houver, a nota com os itens e o mercado, numa operação só. */
  create(
    closingId: number,
    createdById: number,
    data: ExpenseData,
    invoice: AttachedInvoice | null,
    event?: ExpenseEventInput,
  ): Promise<ExpenseRecord>;
  findById(id: number): Promise<ExpenseRecord | null>;
  update(
    id: number,
    data: ExpenseData,
    invoice: ExpenseInvoiceChange,
    event?: ExpenseEventInput,
  ): Promise<ExpenseRecord>;
  cancel(
    id: number,
    canceledById: number,
    at: Date,
    event: ExpenseEventInput,
  ): Promise<ExpenseRecord>;
  restore(id: number, event: ExpenseEventInput): Promise<ExpenseRecord>;
  listEvents(expenseId: number): Promise<ExpenseEventRecord[]>;
  /** Apaga o gasto e a nota dele junto. */
  delete(id: number): Promise<void>;
  listByClosing(closingId: number): Promise<ExpenseRecord[]>;
}
