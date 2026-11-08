import type { UserRole } from './types';

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

/** Um passo do histórico do gasto (2026-11-08). */
export interface ExpenseEvent {
  id: number;
  /** ISO. */
  at: string;
  userRole: UserRole;
  details: ExpenseEventDetails;
}
