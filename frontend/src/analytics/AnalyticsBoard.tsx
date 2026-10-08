import type { AnalyticsReport } from '../api/analytics-types';
import { countLabel, describeRange } from './analytics-format';
import { DailySection, WeekdaySection } from './CalendarSections';
import { DeliverySections } from './DeliverySections';
import { PaymentSection } from './PaymentSection';
import { ProductSections } from './ProductSections';
import { SalesVisor } from './SalesVisor';

/** Pedidos importados da planilha antiga só têm o valor: entram no visor, não nos rankings. */
function ImportedNote({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p className="hint analytics-imported">
      {countLabel(count, 'pedido antigo', 'pedidos antigos')} (importados da
      planilha, só com o valor) entram no faturamento, mas não nos lanches.
    </p>
  );
}

/**
 * A análise do período: visor com os números de cabeça, depois o que vende, onde e quando.
 * Com um dia só, o gráfico noite a noite e os dias da semana não dizem nada e ficam de fora.
 */
export function AnalyticsBoard({ report }: { report: AnalyticsReport }) {
  const severalNights = report.daily.length > 1;
  return (
    <>
      <p className="analytics-compare">
        Comparado com {describeRange(report.previous)}
      </p>
      <SalesVisor
        totals={report.totals}
        previous={report.previous.totals}
        changes={report.changes}
      />
      <ImportedNote count={report.items.ordersWithoutItems} />
      <div className="analytics-grid">
        {severalNights && <DailySection report={report} />}
        <ProductSections report={report} />
        <DeliverySections report={report} />
        {severalNights && <WeekdaySection report={report} />}
        <PaymentSection report={report} />
      </div>
    </>
  );
}
