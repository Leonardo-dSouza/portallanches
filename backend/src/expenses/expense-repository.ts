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
  /** Itens fora da lanchonete (2026-10-25), para o selo "20 itens · 3 fora". */
  outsideItemCount: number;
  amountDue: string;
}

export interface ExpenseRecord extends ExpenseData {
  id: number;
  closingId: number;
  createdById: number;
  invoice: ExpenseInvoiceSummary | null;
}

/** Nota lida para prender ao gasto, com as posições dos itens fora da lanchonete. */
export interface AttachedInvoice {
  invoice: NfceInvoice;
  outsidePositions: number[];
}

/**
 * O que acontece com a nota do gasto ao salvar a edição. Na nota mantida, `outsidePositions`
 * troca as marcas; ausente, ficam as de antes.
 */
export type ExpenseInvoiceChange =
  | { kind: 'keep'; outsidePositions?: number[] }
  | { kind: 'remove' }
  | ({ kind: 'attach' } & AttachedInvoice);

export interface ExpenseRepository {
  /** Grava o gasto e, se houver, a nota com os itens e o mercado, numa operação só. */
  create(
    closingId: number,
    createdById: number,
    data: ExpenseData,
    invoice: AttachedInvoice | null,
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
