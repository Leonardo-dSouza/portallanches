import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/api-client';
import { useApi } from '../api/api-context';
import { createDayClosingApi, type DayClosing } from '../api/day-closing-api';
import { errorMessage } from '../api/error-message';

export type DayClosingState =
  | { kind: 'loading' }
  | { kind: 'ready'; day: DayClosing }
  | { kind: 'missing' }
  | { kind: 'failed'; message: string };

interface Outcome {
  date: string;
  state: DayClosingState;
}

const outcomeOf = (failure: unknown): DayClosingState =>
  failure instanceof ApiError && failure.status === 404
    ? { kind: 'missing' }
    : { kind: 'failed', message: errorMessage(failure) };

/**
 * Pedidos, gastos e resumo do caixa de um dia, só para ler; dia sem caixa vira `missing`.
 *
 * @example const state = useDayClosing('2026-09-25');
 */
export function useDayClosing(date: string): DayClosingState {
  const api = useApi();
  const closings = useMemo(() => createDayClosingApi(api), [api]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  useEffect(() => {
    let active = true;
    closings.load(date).then(
      (day) => active && setOutcome({ date, state: { kind: 'ready', day } }),
      (failure) => active && setOutcome({ date, state: outcomeOf(failure) }),
    );
    return () => {
      active = false;
    };
  }, [closings, date]);
  return outcome?.date === date ? outcome.state : { kind: 'loading' };
}
