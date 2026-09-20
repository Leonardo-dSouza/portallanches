import { useState, type RefObject } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { Expense, ExpenseType } from '../api/types';
import {
  buildExpenseRequest,
  EMPTY_EXPENSE_FORM,
  expenseFormValuesOf,
  findExpenseType,
  type ExpenseFormValues,
} from './expense-form-values';
import { saveExpenseRequest } from './save-expense';

interface UseExpenseFormArgs {
  cash: CashApi;
  types: ExpenseType[];
  editing: Expense | null;
  onSaved(): void;
  /** Campo que recebe o foco depois de salvar (lançamento em sequência). */
  focusRef: RefObject<HTMLInputElement | null>;
}

export interface ExpenseFormState {
  values: ExpenseFormValues;
  error: string | null;
  saving: boolean;
  newTypeName: string | null;
  setField(field: keyof ExpenseFormValues, value: string): void;
  submit(): Promise<void>;
}

export function useExpenseForm(args: UseExpenseFormArgs): ExpenseFormState {
  const { cash, types, editing, onSaved, focusRef } = args;
  const [values, setValues] = useState(() =>
    editing ? expenseFormValuesOf(editing, types) : EMPTY_EXPENSE_FORM,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = (field: keyof ExpenseFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    const built = buildExpenseRequest(values, types);
    if (!built.ok) return setError(built.error);
    setSaving(true);
    try {
      await saveExpenseRequest(cash, editing?.id ?? null, built.request);
      setValues(EMPTY_EXPENSE_FORM);
      setError(null);
      onSaved();
      focusRef.current?.focus();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  const typed = values.typeName.trim();
  const isNew = typed && !findExpenseType(types, typed);
  return {
    values,
    error,
    saving,
    newTypeName: isNew ? typed : null,
    setField,
    submit,
  };
}
