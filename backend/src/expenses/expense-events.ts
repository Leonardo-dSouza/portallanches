import type { UserRole } from '../auth/session-user.js';
import type { ExpenseRecord } from './expense-repository.js';

/** Resumo da nota fiscal guardado na foto do gasto para o histórico. */
export interface ExpenseInvoiceSnapshot {
  vendorName: string;
  outsideCount: number;
}

/** Foto do gasto num determinado instante para o histórico. */
export interface ExpenseSnapshot {
  amount: string;
  expenseTypeId: number;
  description: string | null;
  invoice: ExpenseInvoiceSnapshot | null;
  paymentLabel?: string | null;
}

/** O que cada passo do histórico de gastos grava. */
export type ExpenseEventDetails =
  | { kind: 'CREATED'; expense: ExpenseSnapshot }
  | { kind: 'EDITED'; before: ExpenseSnapshot; after: ExpenseSnapshot }
  | { kind: 'CANCELED'; reason?: string }
  | { kind: 'RESTORED' };

export type ExpenseEventKind = ExpenseEventDetails['kind'];

/** Dados para gravar um evento na mesma transação da mudança. */
export interface ExpenseEventInput {
  userId: number;
  details: ExpenseEventDetails;
}

/** Registro de histórico lido do banco para o pop-up do admin. */
export interface ExpenseEventRecord {
  id: number;
  at: Date;
  userRole: UserRole;
  details: ExpenseEventDetails;
}

/**
 * Tira uma foto dos campos monitorados do gasto para o histórico.
 *
 * @example snapshotOfExpense(record) // { amount: '120.00', expenseTypeId: 1, ... }
 */
export function snapshotOfExpense(record: ExpenseRecord): ExpenseSnapshot {
  return {
    amount: record.amount,
    expenseTypeId: record.expenseTypeId,
    description: record.description,
    invoice: record.invoice
      ? {
          vendorName: record.invoice.vendorName,
          outsideCount: record.invoice.outsideItemCount,
        }
      : null,
    paymentLabel: record.invoice?.paymentLabel ?? null,
  };
}
