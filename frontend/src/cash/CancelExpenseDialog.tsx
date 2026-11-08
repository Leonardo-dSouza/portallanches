import { Ban } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { formatMoney } from '../api/money';
import type { Expense } from '../api/types';
import { Dialog } from '../components/Dialog';

interface CancelExpenseDialogProps {
  cash: CashApi;
  expense: Expense;
  onCanceled(): void;
  onClose(): void;
}

/**
 * Cancelar no lugar de apagar (decisão de 2026-11-08): pede confirmação na tela (sem senha).
 * O gasto cancelado continua na lista riscado e sai de todas as somas.
 */
export function CancelExpenseDialog({
  cash,
  expense,
  onCanceled,
  onClose,
}: CancelExpenseDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await cash.cancelExpense(expense.id);
      onCanceled();
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Cancelar gasto #${expense.id}`} onClose={onClose}>
      <form className="cancel-order" onSubmit={(e) => void handleSubmit(e)}>
        <p className="hint">
          {formatMoney(expense.amount)} · sai do caixa e dos relatórios, e fica
          na lista como cancelado.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="submit"
            className="button button-danger"
            disabled={busy}
            aria-busy={busy}
          >
            <Ban aria-hidden />
            Cancelar gasto
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Voltar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
