import type { CashApi } from '../api/cash-api';
import type { Expense } from '../api/types';
import type { ExpenseRequest } from './expense-form-values';

/**
 * Grava o gasto; se o tipo é novo, cria antes.
 *
 * @example await saveExpenseRequest(cash, null, request);
 */
export async function saveExpenseRequest(
  cash: CashApi,
  expenseId: number | null,
  request: ExpenseRequest,
): Promise<Expense> {
  const { newTypeName, expenseTypeId, ...fields } = request;
  const typeId = newTypeName
    ? (await cash.createExpenseType(newTypeName)).id
    : expenseTypeId;
  if (typeId === null)
    throw new Error(
      `Pedido de gasto sem tipo: recebido ${JSON.stringify(request)}, esperado expenseTypeId ou newTypeName`,
    );
  return cash.saveExpense(expenseId, { ...fields, expenseTypeId: typeId });
}
