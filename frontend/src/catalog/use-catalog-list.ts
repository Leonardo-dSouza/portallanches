import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api/error-message';

export interface CatalogList<T> {
  items: T[] | null;
  error: string | null;
  reload(): void;
}

interface Outcome<T> {
  items: T[] | null;
  error: string | null;
}

/** Carrega uma lista de cadastro ao montar e a cada `reload` (mantém a tabela na tela enquanto recarrega). */
export function useCatalogList<T>(load: () => Promise<T[]>): CatalogList<T> {
  const [outcome, setOutcome] = useState<Outcome<T>>({
    items: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load().then(
      (items) => active && setOutcome({ items, error: null }),
      (failure) =>
        active && setOutcome({ items: null, error: errorMessage(failure) }),
    );
    return () => {
      active = false;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...outcome, reload };
}
