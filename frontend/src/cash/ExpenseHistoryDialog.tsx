import { useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { ExpenseEvent } from '../api/expense-event-types';
import type { Expense, ExpenseType } from '../api/types';
import { Dialog } from '../components/Dialog';
import { eventText } from './expense-event-text';
import { formatOrderTime } from './order-time';

interface ExpenseHistoryDialogProps {
  cash: CashApi;
  expense: Expense;
  types: ExpenseType[];
  onClose(): void;
}

function useExpenseEvents(cash: CashApi, expenseId: number) {
  const [events, setEvents] = useState<ExpenseEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    cash.listExpenseEvents(expenseId).then(
      (read) => current && setEvents(read),
      (failure) => current && setError(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [cash, expenseId]);

  return { events, error };
}

/**
 * Diálogo do histórico de um gasto para o administrador: criado, editado, cancelado e restaurado.
 *
 * @example <ExpenseHistoryDialog cash={cash} expense={expense} types={day.expenseTypes} onClose={close} />
 */
export function ExpenseHistoryDialog({
  cash,
  expense,
  types,
  onClose,
}: ExpenseHistoryDialogProps) {
  const { events, error } = useExpenseEvents(cash, expense.id);

  return (
    <Dialog title={`Histórico do gasto #${expense.id}`} onClose={onClose}>
      <section className="order-history" aria-label="Histórico do gasto">
        {error && <p className="form-error">{error}</p>}
        {events && events.length === 0 && (
          <p className="hint">Lançado antes do histórico existir.</p>
        )}
        {events && events.length > 0 && (
          <ol>
            {events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.at}>{formatOrderTime(event.at)}</time>
                {eventText(event, types)}
              </li>
            ))}
          </ol>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </section>
    </Dialog>
  );
}
