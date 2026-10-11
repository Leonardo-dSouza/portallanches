import { useMemo, useState } from 'react';
import { createAdminApi } from '../api/admin-api';
import { useApi } from '../api/api-context';
import type { DateRange } from '../api/types';
import { LoadFailure } from '../catalog/LoadFailure';
import { Skeleton } from '../components/Skeleton';
import { weekdayTotalLabel } from './history-link';
import { PeriodTable } from './PeriodTable';
import { usePeriodReport } from './use-period-report';
import { WeekdayFilter } from './WeekdayFilter';

interface NightsViewProps {
  /** Período escolhido na Análise; null = inválido (não busca). */
  range: DateRange | null;
  /** Dia da semana vindo do link "Ver as sextas em Noites" (`?dia=`). */
  initialWeekday: number | null;
}

/**
 * Aba Noites da Análise (o antigo Histórico, juntado em 2026-10-11): os dias do período com os
 * totais, o filtro por dia da semana e o Reabrir/Fechar de cada dia.
 *
 * @example <NightsView range={period.range} initialWeekday={null} />
 */
export function NightsView({ range, initialWeekday }: NightsViewProps) {
  const api = useApi();
  const admin = useMemo(() => createAdminApi(api), [api]);
  const [weekday, setWeekday] = useState(initialWeekday);
  const { report, error, loading, reload } = usePeriodReport(
    admin,
    range,
    weekday,
  );
  const totalsLabel =
    weekday === null ? 'Total do período' : weekdayTotalLabel(weekday);
  return (
    <>
      <WeekdayFilter value={weekday} onChange={setWeekday} />
      {loading && <Skeleton label="Carregando as noites…" rows={5} />}
      {error && <LoadFailure message={error} onRetry={reload} />}
      {report && range && (
        <PeriodTable
          report={report}
          admin={admin}
          totalsLabel={totalsLabel}
          onChanged={reload}
        />
      )}
    </>
  );
}
