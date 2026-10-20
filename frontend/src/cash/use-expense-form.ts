import { useState, type RefObject } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { InvoicePreview } from '../api/invoice-types';
import type { Expense, ExpenseInput, ExpenseType } from '../api/types';
import { fillFromInvoice } from './expense-invoice-draft';
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
  /** Preenche com a nota lida (valor, e tipo/observação se vazios). */
  fillFromInvoice(preview: InvoicePreview): void;
  /** Salva com o campo da nota; true quando gravou. */
  submit(invoiceField: Pick<ExpenseInput, 'invoiceCode'>): Promise<boolean>;
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

  const fillWithInvoice = (preview: InvoicePreview) =>
    setValues((current) => fillFromInvoice(current, preview, types));

  const submit = async (invoiceField: Pick<ExpenseInput, 'invoiceCode'>) => {
    const built = buildExpenseRequest(values, types);
    if (!built.ok) {
      setError(built.error);
      return false;
    }
    setSaving(true);
    try {
      const request = { ...built.request, ...invoiceField };
      await saveExpenseRequest(cash, editing?.id ?? null, request);
      setValues(EMPTY_EXPENSE_FORM);
      setError(null);
      onSaved();
      focusRef.current?.focus();
      return true;
    } catch (failure) {
      setError(errorMessage(failure));
      return false;
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
    fillFromInvoice: fillWithInvoice,
    submit,
  };
}
