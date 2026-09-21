import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { formatMoney } from '../api/money';
import type { Expense } from '../api/types';
import type { CashDay } from './use-cash-day';

interface ExpenseListProps {
  cash: CashApi;
  day: CashDay;
  locked: boolean;
  onEdit(expense: Expense): void;
  onChanged(): void;
}

export function ExpenseList({
  cash,
  day,
  locked,
  onEdit,
  onChanged,
}: ExpenseListProps) {
  const [error, setError] = useState<string | null>(null);
  const remove = async (expense: Expense) => {
    try {
      await cash.deleteExpense(expense.id);
      setError(null);
      onChanged();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };
  if (day.expenses.length === 0)
    return (
      <EmptyState
        title="Nenhum gasto hoje"
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
        <table className="table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th className="num">Valor</th>
              <th>Observação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {day.expenses.map((expense) => (
              <tr key={expense.id}>
                <td>
                  {day.expenseTypes.find((t) => t.id === expense.expenseTypeId)
                    ?.name ?? '—'}
                </td>
                <td className="num strong">{formatMoney(expense.amount)}</td>
                <td>{expense.description ?? '—'}</td>
                <td className="row-actions">
                  {!locked && (
                    <>
                      <button
                        type="button"
                        className="button-ghost"
                        onClick={() => onEdit(expense)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="button-ghost button-danger"
                        onClick={() => void remove(expense)}
                      >
                        Apagar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
