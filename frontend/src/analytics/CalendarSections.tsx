import type { AnalyticsReport } from '../api/analytics-types';
import { formatMoney } from '../api/money';
import {
  countLabel,
  formatDecimal,
  moneyBar,
  weekdayName,
} from './analytics-format';
import { AnalyticsSection } from './AnalyticsSection';
import { historyLink, weekdayLinkLabel } from '../history/history-link';
import { BarList } from './BarList';
import { DailyColumns } from './DailyColumns';

type CalendarData = Pick<
  AnalyticsReport,
  'from' | 'elapsedTo' | 'daily' | 'byWeekday'
>;

/** Faturamento noite a noite (linha inteira) e qual dia da semana rende mais. */
export function DailySection({ report }: { report: CalendarData }) {
  return (
    <AnalyticsSection title="Faturamento por noite" wide>
      <DailyColumns days={report.daily} />
    </AnalyticsSection>
  );
}

export function WeekdaySection({ report }: { report: CalendarData }) {
  return (
    <AnalyticsSection
      title="Dias da semana"
      note="Média por noite aberta. Clique num dia para ver essas noites no Histórico."
    >
      <BarList
        empty="Nenhuma noite aberta no período."
        rows={report.byWeekday.map((day) => ({
          key: day.weekday,
          label: weekdayName(day.weekday),
          detail: countLabel(day.nights, 'noite aberta', 'noites abertas'),
          value: moneyBar(day.averageRevenue),
          primary: formatMoney(day.averageRevenue),
          secondary: `${formatDecimal(day.averageOrders)} pedidos`,
          link: {
            to: historyLink(
              { from: report.from, to: report.elapsedTo },
              day.weekday,
            ),
            label: weekdayLinkLabel(day.weekday),
          },
        }))}
      />
    </AnalyticsSection>
  );
}
