export const EXPENSE_REPOSITORY = Symbol('EXPENSE_REPOSITORY');

export interface ExpenseData {
  expenseTypeId: number;
  description: string | null;
  amount: string;
}

export interface ExpenseRecord extends ExpenseData {
  id: number;
  closingId: number;
  createdById: number;
}

export interface ExpenseRepository {
  create(
    closingId: number,
    createdById: number,
    data: ExpenseData,
  ): Promise<ExpenseRecord>;
  findById(id: number): Promise<ExpenseRecord | null>;
  update(id: number, data: ExpenseData): Promise<ExpenseRecord>;
  delete(id: number): Promise<void>;
  listByClosing(closingId: number): Promise<ExpenseRecord[]>;
}
