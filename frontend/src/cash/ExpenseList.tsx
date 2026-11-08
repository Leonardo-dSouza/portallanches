import { Ban, History, Pencil, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { formatMoney } from '../api/money';
import type { Expense } from '../api/types';
import { useAuth } from '../auth/auth-context';
import { EmptyState } from '../components/EmptyState';
import { InvoiceItemsButton } from '../purchases/InvoiceItemsButton';
import { CancelExpenseDialog } from './CancelExpenseDialog';
import { ExpenseHistoryDialog } from './ExpenseHistoryDialog';
import type { CashDay } from './use-cash-day';

interface ExpenseListProps {
  cash: CashApi;
  day: CashDay;
  locked: boolean;
  onEdit(expense: Expense): void;
  onChanged(): void;
}

interface ExpenseRowActionsProps {
  expense: Expense;
  isCanceled: boolean;
  isAdmin: boolean;
  locked: boolean;
  onEdit(expense: Expense): void;
  onCancel(expense: Expense): void;
  onRestore(expense: Expense): void;
  onHistory(expense: Expense): void;
}

function ExpenseRowActions({
  expense,
  isCanceled,
  isAdmin,
  locked,
  onEdit,
  onCancel,
  onRestore,
  onHistory,
}: ExpenseRowActionsProps) {
  if (isCanceled) {
    return (
      <td className="row-actions">
        {isAdmin && (
          <>
            <button
              type="button"
              className="button button-secondary button-sm"
              onClick={() => onRestore(expense)}
            >
              <RotateCcw aria-hidden />
              Restaurar
            </button>
            <button
              type="button"
              className="button-ghost button-sm"
              onClick={() => onHistory(expense)}
            >
              <History aria-hidden />
              Histórico
            </button>
          </>
        )}
      </td>
    );
  }
  return (
    <td className="row-actions">
      {!locked && (
        <>
          <button
            type="button"
            className="button button-secondary button-sm"
            onClick={() => onEdit(expense)}
          >
            <Pencil aria-hidden />
            Editar
          </button>
          <button
            type="button"
            className="button-ghost button-sm button-danger"
            onClick={() => onCancel(expense)}
          >
            <Ban aria-hidden />
            Cancelar
          </button>
        </>
      )}
      {isAdmin && (
        <button
          type="button"
          className="button-ghost button-sm"
          onClick={() => onHistory(expense)}
        >
          <History aria-hidden />
          Histórico
        </button>
      )}
    </td>
  );
}

/**
 * Lista de gastos do dia no caixa: permite editar, cancelar (com confirmação),
 * restaurar (só admin) e abrir o histórico de eventos (só admin).
 */
export function ExpenseList({
  cash,
  day,
  locked,
  onEdit,
  onChanged,
}: ExpenseListProps) {
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<Expense | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Expense | null>(null);
  const isAdmin = useAuth().user?.role === 'ADMIN';

  const restore = async (expense: Expense) => {
    try {
      await cash.restoreExpense(expense.id);
      setError(null);
      onChanged();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  if (day.expenses.length === 0)
    return (
      <EmptyState
        title="Nenhum gasto neste dia"
        hint="Use o formulário ao lado para lançar o primeiro."
      />
    );

  return (
    <div className="card card-flush">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table className="table table-stack">
          <thead>
            <tr>
              <th>Tipo</th>
              <th className="num">Valor</th>
              <th>Observação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {day.expenses.map((expense) => {
              const isCanceled = Boolean(expense.canceledAt);
              return (
                <tr
                  key={expense.id}
                  className="expense-row"
                  data-canceled={isCanceled || undefined}
                >
                  <td data-label="Tipo">
                    <span className="expense-type-cell">
                      {day.expenseTypes.find(
                        (t) => t.id === expense.expenseTypeId,
                      )?.name ?? '—'}
                      {isCanceled && (
                        <span className="tag" data-kind="CANCELED">
                          Cancelado
                        </span>
                      )}
                      {expense.invoice && (
                        <InvoiceItemsButton invoice={expense.invoice} />
                      )}
                    </span>
                  </td>
                  <td className="num strong" data-label="Valor">
                    {formatMoney(expense.amount)}
                  </td>
                  <td data-label="Observação">{expense.description ?? '—'}</td>
                  <ExpenseRowActions
                    expense={expense}
                    isCanceled={isCanceled}
                    isAdmin={isAdmin}
                    locked={locked}
                    onEdit={onEdit}
                    onCancel={(e) => setCanceling(e)}
                    onRestore={(e) => void restore(e)}
                    onHistory={(e) => setHistoryTarget(e)}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canceling && (
        <CancelExpenseDialog
          cash={cash}
          expense={canceling}
          onCanceled={onChanged}
          onClose={() => setCanceling(null)}
        />
      )}
      {historyTarget && (
        <ExpenseHistoryDialog
          cash={cash}
          expense={historyTarget}
          types={day.expenseTypes}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}
