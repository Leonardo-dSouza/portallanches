import { useState } from 'react';
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
    return <p className="page-message">Nenhum gasto hoje.</p>;
  return (
    <div className="card">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Valor</th>
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
              <td>{formatMoney(expense.amount)}</td>
              <td>{expense.description ?? '—'}</td>
              <td className="row-actions">
                {!locked && (
                  <>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => onEdit(expense)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
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
  );
}
