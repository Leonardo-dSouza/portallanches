import { useCallback, useEffect, useState } from 'react';
import type { AdminApi } from '../api/admin-api';
import { errorMessage } from '../api/error-message';
import type { DateRange, PeriodReport } from '../api/types';

interface Outcome {
  rangeKey: string;
  report: PeriodReport | null;
  error: string | null;
}

export interface PeriodReportState {
  report: PeriodReport | null;
  error: string | null;
  /** Só é `true` quando o período mudou; `reload` mantém a tabela na tela. */
  loading: boolean;
  reload(): void;
}

/**
 * Carrega o relatório do período. Respostas de períodos antigos são descartadas
 * (o admin troca de atalho mais rápido que a API responde). `range: null` = inválido, não busca.
 */
export function usePeriodReport(
  admin: AdminApi,
  range: DateRange | null,
): PeriodReportState {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);
  const from = range?.from;
  const to = range?.to;
  const rangeKey = `${from}|${to}`;

  useEffect(() => {
    if (!from || !to) return;
    let active = true;
    admin.periodReport({ from, to }).then(
      (report) => active && setOutcome({ rangeKey, report, error: null }),
      (failure) =>
        active &&
        setOutcome({ rangeKey, report: null, error: errorMessage(failure) }),
    );
    return () => {
      active = false;
    };
  }, [admin, from, to, rangeKey, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  const current = outcome?.rangeKey === rangeKey ? outcome : null;
  return {
    report: current?.report ?? null,
    error: current?.error ?? null,
    loading: range !== null && current === null,
    reload,
  };
}
