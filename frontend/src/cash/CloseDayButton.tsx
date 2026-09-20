import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';

interface CloseDayButtonProps {
  cash: CashApi;
  onClosed(): void;
}

/** Fechar é irreversível para o caixa (só o admin reabre): pede uma segunda confirmação. */
export function CloseDayButton({ cash, onClosed }: CloseDayButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = async () => {
    try {
      await cash.closeToday();
      onClosed();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };
  return (
    <div className="close-day">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {confirming ? (
        <>
          <button type="button" className="button" onClick={() => void close()}>
            Confirmar fechamento
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setConfirming(false)}
          >
            Voltar
          </button>
        </>
      ) : (
        <button
          type="button"
          className="button"
          onClick={() => setConfirming(true)}
        >
          Fechar o dia
        </button>
      )}
    </div>
  );
}
