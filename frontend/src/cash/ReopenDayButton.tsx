import { useMemo, useState } from 'react';
import { createAdminApi } from '../api/admin-api';
import { useApi } from '../api/api-context';
import { errorMessage } from '../api/error-message';

interface ReopenDayButtonProps {
  date: string;
  onReopened(): void;
}

/** Reabrir não perde dado e o admin fecha de novo: por isso um clique só, sem confirmação. */
export function ReopenDayButton({ date, onReopened }: ReopenDayButtonProps) {
  const api = useApi();
  const admin = useMemo(() => createAdminApi(api), [api]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reopen = async () => {
    setBusy(true);
    try {
      await admin.reopenDay(date);
      onReopened();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  };
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
        onClick={() => void reopen()}
      >
        Reabrir dia
      </button>
    </>
  );
}
