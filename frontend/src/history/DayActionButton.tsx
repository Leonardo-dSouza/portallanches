import { useState } from 'react';
import type { AdminApi } from '../api/admin-api';
import { errorMessage } from '../api/error-message';
import type { ClosingReport } from '../api/types';

const ACTION_LABELS = {
  reopen: { ask: 'Reabrir', confirm: 'Confirmar reabertura' },
  close: { ask: 'Fechar', confirm: 'Confirmar fechamento' },
} as const;

interface DayActionButtonProps {
  day: ClosingReport;
  admin: AdminApi;
  onChanged(): void;
  onError(message: string): void;
}

/**
 * Reabrir e fechar pedem confirmação (um 2º clique), que some ao sair do botão: o caixa não
 * desfaz o fechamento, e reabrir sem querer deixa o dia editável (pedido do usuário, 2026-10-08).
 */
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
    if (confirming) return void run();
    setConfirming(true);
  };
  const label =
    ACTION_LABELS[isClosed ? 'reopen' : 'close'][
      confirming ? 'confirm' : 'ask'
    ];
  return (
    <button
      type="button"
      className={
        !confirming
          ? 'button-ghost button-sm'
          : isClosed
            ? 'button button-sm'
            : 'button button-sm button-danger'
      }
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
