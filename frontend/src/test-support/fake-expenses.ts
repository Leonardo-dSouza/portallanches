import { ApiError, type HttpMethod } from '../api/api-client';
import type { ExpenseEvent, ExpenseSnapshot } from '../api/expense-event-types';
import type { Expense } from '../api/types';
import {
  fakeSavedInvoice,
  type FakeExpenseStore,
} from './fake-expense-invoices';
import { savedInto } from './fake-lists';

const ACTION_ROUTE = /^\/expenses\/(\d+)\/(cancel|restore|events)$/;
const CANCELED_AT = '2026-11-08T13:00:00Z';

function snapshotOf(expense: Expense): ExpenseSnapshot {
  return {
    amount: expense.amount,
    expenseTypeId: expense.expenseTypeId,
    description: expense.description,
    invoice: expense.invoice
      ? {
          vendorName: expense.invoice.vendorName,
          outsideCount: expense.invoice.outsideItemCount,
        }
      : null,
  };
}

function recordEvent(
  store: FakeExpenseStore,
  expenseId: number,
  event: Omit<ExpenseEvent, 'id' | 'at' | 'userRole'>,
): void {
  store.expenseEvents ??= {};
  const list = store.expenseEvents[expenseId] ?? [];
  list.push({
    id: list.length + 1,
    at: new Date().toISOString(),
    userRole: store.role ?? 'CAIXA',
    ...event,
  });
  store.expenseEvents[expenseId] = list;
}

function handleCancel(store: FakeExpenseStore, id: number): Expense {
  const expense = store.expenses.find((e) => e.id === id);
  if (!expense) throw new ApiError(404, `Gasto ${id} não encontrado`);
  if (expense.canceledAt)
    throw new ApiError(409, `Gasto #${id} já cancelado: esperado gasto ativo`);
  const canceled: Expense = {
    ...expense,
    canceledAt: CANCELED_AT,
    canceledById: 1,
  };
  store.expenses = savedInto(store.expenses, canceled, 'PUT');
  recordEvent(store, id, { details: { kind: 'CANCELED' } });
  return canceled;
}

function handleRestore(store: FakeExpenseStore, id: number): Expense {
  if (store.role !== 'ADMIN')
    throw new ApiError(403, 'Acesso restrito ao administrador');
  const expense = store.expenses.find((e) => e.id === id);
  if (!expense) throw new ApiError(404, `Gasto ${id} não encontrado`);
  if (!expense.canceledAt)
    throw new ApiError(
      409,
      `Gasto #${id} não está cancelado: esperado um gasto cancelado`,
    );
  const restored: Expense = {
    ...expense,
    canceledAt: null,
    canceledById: null,
  };
  store.expenses = savedInto(store.expenses, restored, 'PUT');
  recordEvent(store, id, { details: { kind: 'RESTORED' } });
  return restored;
}

function handleEvents(store: FakeExpenseStore, id: number): ExpenseEvent[] {
  if (store.role !== 'ADMIN')
    throw new ApiError(403, 'Acesso restrito ao administrador');
  return store.expenseEvents?.[id] ?? [];
}

/**
 * `/expenses` do fake: lista, cancela, restaura, histórico e grava como o backend.
 *
 * @example fakeExpenseRoute(api, 'POST', '/expenses/1/cancel', 1, {})
 */
export function fakeExpenseRoute(
  store: FakeExpenseStore,
  method: HttpMethod,
  path: string,
  id: number,
  body: Record<string, unknown>,
): unknown {
  const action = ACTION_ROUTE.exec(path);
  if (action) {
    const actionId = Number(action[1]);
    const op = action[2];
    if (op === 'cancel') return handleCancel(store, actionId);
    if (op === 'restore') return handleRestore(store, actionId);
    if (op === 'events') return handleEvents(store, actionId);
  }
  if (method === 'GET') return store.expenses;
  if (method === 'DELETE') {
    return handleCancel(store, id);
  }
  return saveExpense(store, method, id, body);
}

function saveExpense(
  store: FakeExpenseStore,
  method: HttpMethod,
  id: number,
  body: Record<string, unknown>,
): Expense {
  const previous = store.expenses.find((e) => e.id === id);
  if (previous?.canceledAt)
    throw new ApiError(409, `Gasto #${id} já cancelado: esperado gasto ativo`);
  const { invoiceCode, invoicePage: _ip, outsidePositions, ...fields } = body;
  const expense: Expense = {
    id: method === 'PUT' ? id : store.takeId(),
    description: null,
    canceledAt: null,
    canceledById: null,
    ...fields,
    invoice: fakeSavedInvoice(
      store,
      invoiceCode,
      previous,
      outsidePositions as number[] | undefined,
    ),
  } as Expense;
  store.expenses = savedInto(store.expenses, expense, method);
  if (method === 'POST') {
    recordEvent(store, expense.id, {
      details: { kind: 'CREATED', expense: snapshotOf(expense) },
    });
  } else if (previous) {
    recordEvent(store, expense.id, {
      details: {
        kind: 'EDITED',
        before: snapshotOf(previous),
        after: snapshotOf(expense),
      },
    });
  }
  return expense;
}
