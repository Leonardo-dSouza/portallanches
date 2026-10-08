import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api/error-message';
import type { DateRange } from '../api/types';

interface Outcome<T> {
  rangeKey: string;
  data: T | null;
  error: string | null;
}

export interface RangeDataState<T> {
  data: T | null;
  error: string | null;
  /** Só é `true` quando o período mudou; `reload` mantém a tela anterior. */
  loading: boolean;
  reload(): void;
}

/**
 * Carrega os dados de um período (histórico, análise). Respostas de períodos antigos são
 * descartadas (o admin troca de atalho mais rápido que a API responde). `range: null` =
 * período inválido, não busca. `load` precisa ser estável (`useMemo`/`useCallback`): quando
 * ele muda (ex.: outro filtro), a busca é refeita.
 *
 * @example const { data } = useRangeData(analytics.report, { from: '2026-09-01', to: '2026-09-30' });
 */
export function useRangeData<T>(
  load: (range: DateRange) => Promise<T>,
  range: DateRange | null,
  /** O que mais muda a busca além das datas (ex.: o dia da semana), para não mostrar resposta velha. */
  variant = '',
): RangeDataState<T> {
  const [outcome, setOutcome] = useState<Outcome<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const from = range?.from;
  const to = range?.to;
  const rangeKey = `${from}|${to}|${variant}`;

  useEffect(() => {
    if (!from || !to) return;
    let active = true;
    load({ from, to }).then(
      (data) => active && setOutcome({ rangeKey, data, error: null }),
      (failure) =>
        active &&
        setOutcome({ rangeKey, data: null, error: errorMessage(failure) }),
    );
    return () => {
      active = false;
    };
  }, [load, from, to, rangeKey, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  const current = outcome?.rangeKey === rangeKey ? outcome : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: range !== null && current === null,
    reload,
  };
}
