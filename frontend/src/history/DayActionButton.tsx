import { useState } from 'react';
import type { AdminApi } from '../api/admin-api';
import { errorMessage } from '../api/error-message';
import type { ClosingReport } from '../api/types';

interface DayActionButtonProps {
  day: ClosingReport;
  admin: AdminApi;
  onChanged(): void;
  onError(message: string): void;
}

/** Reabrir é direto; fechar pede confirmação (o caixa não desfaz), que some ao sair do botão. */
export function DayActionButton({
  day,
  admin,
  onChanged,
  onError,
}: DayActionButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const isClosed = day.status === 'CLOSED';
  const run = async () => {
    setBusy(true);
    try {
      await (isClosed
        ? admin.reopenDay(day.businessDate)
        : admin.closeDay(day.businessDate));
      onChanged();
    } catch (failure) {
      onError(errorMessage(failure));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };
  const click = () => {
    if (isClosed || confirming) return void run();
    setConfirming(true);
  };
  const label = isClosed
    ? 'Reabrir'
    : confirming
      ? 'Confirmar fechamento'
      : 'Fechar';
  return (
    <button
      type="button"
      className="button-ghost"
      aria-label={`${label} ${day.businessDate}`}
      disabled={busy}
      aria-busy={busy}
      onClick={click}
      onBlur={() => setConfirming(false)}
    >
      {label}
    </button>
  );
}
