import type { NfceInvoice } from '../nfce/nfce-invoice.js';

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
  amountDue: string;
}

export interface ExpenseRecord extends ExpenseData {
  id: number;
  closingId: number;
  createdById: number;
  invoice: ExpenseInvoiceSummary | null;
}

/** O que acontece com a nota do gasto ao salvar a edição. */
export type ExpenseInvoiceChange =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'attach'; invoice: NfceInvoice };

export interface ExpenseRepository {
  /** Grava o gasto e, se houver, a nota com os itens e o mercado, numa operação só. */
  create(
    closingId: number,
    createdById: number,
    data: ExpenseData,
    invoice: NfceInvoice | null,
  ): Promise<ExpenseRecord>;
  findById(id: number): Promise<ExpenseRecord | null>;
  update(
    id: number,
    data: ExpenseData,
    invoice: ExpenseInvoiceChange,
  ): Promise<ExpenseRecord>;
  /** Apaga o gasto e a nota dele junto. */
  delete(id: number): Promise<void>;
  listByClosing(closingId: number): Promise<ExpenseRecord[]>;
}
