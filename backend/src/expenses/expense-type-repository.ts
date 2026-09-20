export const EXPENSE_TYPE_REPOSITORY = Symbol('EXPENSE_TYPE_REPOSITORY');

export interface ExpenseTypeData {
  name: string;
  nameKey: string;
  active: boolean;
}

export interface ExpenseTypeRecord extends ExpenseTypeData {
  id: number;
}

export interface ExpenseTypeRepository {
  list(): Promise<ExpenseTypeRecord[]>;
  findById(id: number): Promise<ExpenseTypeRecord | null>;
  create(data: ExpenseTypeData): Promise<ExpenseTypeRecord>;
  update(id: number, data: ExpenseTypeData): Promise<ExpenseTypeRecord>;
}
