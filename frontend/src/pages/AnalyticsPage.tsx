import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { DateRange } from '../api/types';
import { SummaryView } from '../analytics/SummaryView';
import { SubSections } from '../components/SubSections';
import { toDateKey } from '../history/date-keys';
import { parseWeekdayParam } from '../history/history-link';
import { NightsView } from '../history/NightsView';
import { PeriodPicker } from '../history/PeriodPicker';
import { usePeriodChoice } from '../history/use-period-choice';

interface AnalyticsPageProps {
  /** Só para os testes fixarem a data; em uso normal é o dia de hoje. */
  today?: Date;
}

/** O que a URL traz: `?de=&ate=` (um dia ou período), `?aba=noites` e `?dia=` (0 = domingo). */
interface AnalyticsEntry {
  range: DateRange | null;
  tab: 'summary' | 'nights';
  weekday: number | null;
}

function entryFromUrl(params: URLSearchParams): AnalyticsEntry {
  const from = params.get('de');
  const to = params.get('ate');
  return {
    range: from && to ? { from, to } : null,
    tab: params.get('aba') === 'noites' ? 'nights' : 'summary',
    weekday: parseWeekdayParam(params.get('dia')),
  };
}

function AnalyticsView({
  entry,
  today,
}: {
  entry: AnalyticsEntry;
  today?: Date;
}) {
  const [now] = useState(() => today ?? new Date());
  const period = usePeriodChoice(now, entry.range);
  return (
    <section className="analytics-page">
      <header className="cash-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Análise</h1>
        </div>
      </header>
      <PeriodPicker
        choice={period.choice}
        custom={period.custom}
        today={toDateKey(now)}
        problem={period.problem}
        onChoice={period.setChoice}
        onCustom={period.setCustom}
      />
      <SubSections
        initial={entry.tab}
        sections={[
          {
            id: 'summary',
            label: 'Resumo',
            render: () => <SummaryView range={period.range} />,
          },
          {
            id: 'nights',
            label: 'Noites',
            render: () => (
              <NightsView range={period.range} initialWeekday={entry.weekday} />
            ),
          },
        ]}
      />
    </section>
  );
}

/**
 * Análise para o gerente (só admin), com o mesmo período em duas abas: Resumo (o período
 * comparado com o anterior) e Noites (o antigo Histórico, 2026-10-11: os dias com Reabrir e
 * Fechar). Um link de dia ou de dia da semana remonta a tela já no filtro.
 */
export function AnalyticsPage({ today }: AnalyticsPageProps) {
  const [params] = useSearchParams();
  return (
    <AnalyticsView
      key={params.toString()}
      entry={entryFromUrl(params)}
      today={today}
    />
  );
}
