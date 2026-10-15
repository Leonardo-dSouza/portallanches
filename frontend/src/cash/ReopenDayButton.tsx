import { useMemo, useState } from 'react';
import { createAdminApi } from '../api/admin-api';
import { useApi } from '../api/api-context';
import { errorMessage } from '../api/error-message';
import { useAuth } from '../auth/auth-context';
import { formatDateWithWeekday } from '../history/date-keys';
import { ManagerAuthDialog } from '../manager/ManagerAuthDialog';
import { useManagerRetry } from '../manager/use-manager-retry';

interface ReopenDayButtonProps {
  date: string;
  onReopened(): void;
}

/**
 * Reabrir não perde dado e o dia fecha de novo: um clique para o admin. O caixa (só a noite em
 * andamento) digita a senha do admin desde 2026-10-15.
 */
export function ReopenDayButton({ date, onReopened }: ReopenDayButtonProps) {
  const api = useApi();
  const admin = useMemo(() => createAdminApi(api), [api]);
  const isAdmin = useAuth().user?.role === 'ADMIN';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retry = useManagerRetry(setError);
  const reopen = async (managerPassword?: string) => {
    await admin.reopenDay(date, managerPassword);
    onReopened();
  };
  const reopenAsAdmin = async () => {
    setBusy(true);
    try {
      await reopen();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  };
  const click = () =>
    isAdmin
      ? void reopenAsAdmin()
      : retry.ask(reopen, `Reabrir a noite de ${formatDateWithWeekday(date)}`);
  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="button"
        disabled={busy}
        aria-busy={busy}
        onClick={click}
      >
        Reabrir dia
      </button>
      <ManagerAuthDialog retry={retry} />
    </>
  );
}
