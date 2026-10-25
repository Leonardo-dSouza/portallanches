import type { HttpMethod } from '../api/api-client';
import type { Expense } from '../api/types';
import {
  fakeSavedInvoice,
  type FakeExpenseStore,
} from './fake-expense-invoices';
import { savedInto } from './fake-lists';

/**
 * `/expenses` do fake: lista, apaga e grava como o backend, com a nota presa pelo
 * `invoiceCode` (o corpo gravado fica sem o código, como a resposta da API).
 *
 * @example fakeExpenseRoute(api, 'POST', NaN, { expenseTypeId: 1, amount: '120.00' })
 */
export function fakeExpenseRoute(
  store: FakeExpenseStore,
  method: HttpMethod,
  id: number,
  body: Record<string, unknown>,
): unknown {
  if (method === 'GET') return store.expenses;
  if (method === 'DELETE') {
    store.expenses = store.expenses.filter((e) => e.id !== id);
    return undefined;
  }
  const previous = store.expenses.find((e) => e.id === id);
  const { invoiceCode, outsidePositions, ...fields } = body;
  const expense = {
    id: method === 'PUT' ? id : store.takeId(),
    description: null,
    ...fields,
    invoice: fakeSavedInvoice(
      store,
      invoiceCode,
      previous,
      outsidePositions as number[] | undefined,
    ),
  } as Expense;
  store.expenses = savedInto(store.expenses, expense, method);
  return expense;
}
