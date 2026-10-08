import { Fragment, type ReactNode } from 'react';
import type { AnalyticsReport } from '../api/analytics-types';
import { SwitchRow } from '../components/SwitchRow';
import { blocksFor, type AnalyticsBlockId } from './analytics-blocks';
import { countLabel, describeComparison } from './analytics-format';
import { DailySection, WeekdaySection } from './CalendarSections';
import { DayClosingSections } from './DayClosingSections';
import { CustomerSection, NeighborhoodSection } from './DeliverySections';
import { PaymentSection } from './PaymentSection';
import { CategorySection, TopProductsSection } from './ProductSections';
import { SalesVisor } from './SalesVisor';
import { useAnalyticsBlocks } from './use-analytics-blocks';

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

/** Como desenhar cada bloco (a ordem na tela vem de `ANALYTICS_BLOCKS`). */
const SECTIONS: Record<
  AnalyticsBlockId,
  (report: AnalyticsReport) => ReactNode
> = {
  fechamento: (report) => <DayClosingSections date={report.from} />,
  noites: (report) => <DailySection report={report} />,
  produtos: (report) => <TopProductsSection report={report} />,
  categorias: (report) => <CategorySection report={report} />,
  bairros: (report) => <NeighborhoodSection report={report} />,
  clientes: (report) => <CustomerSection report={report} />,
  semana: (report) => <WeekdaySection report={report} />,
  pagamentos: (report) => <PaymentSection report={report} />,
};

/**
 * A análise do período: visor com os números de cabeça (sempre visível) e os blocos que o
 * gerente escolheu ver. Num dia só entra o fechamento (pedidos, gastos e resumo, só para ler)
 * e saem as noites e os dias da semana.
 */
export function AnalyticsBoard({ report }: { report: AnalyticsReport }) {
  const { shown, toggle } = useAnalyticsBlocks();
  const blocks = blocksFor(report.daily.length <= 1);
  return (
    <>
      <p className="analytics-compare">{describeComparison(report)}</p>
      <SalesVisor
        totals={report.totals}
        previous={report.previous.totals}
        changes={report.changes}
      />
      <ImportedNote count={report.items.ordersWithoutItems} />
      <div className="analytics-blocks">
        <SwitchRow
          label="Mostrar"
          options={blocks}
          isOn={(id) => shown.has(id)}
          onToggle={toggle}
        />
      </div>
      <div className="analytics-grid">
        {blocks
          .filter((block) => shown.has(block.id))
          .map((block) => (
            <Fragment key={block.id}>{SECTIONS[block.id](report)}</Fragment>
          ))}
      </div>
    </>
  );
}
