import type { AnalyticsReport } from '../api/analytics-types';
import { formatMoney, moneyToCents } from '../api/money';
import type { StaffConsumptionSummary } from '../api/staff-consumption-types';
import { AnalyticsSection } from './AnalyticsSection';
import { countLabel } from './analytics-format';
import { BarList, type BarRow } from './BarList';

const personRows = (summary: StaffConsumptionSummary): BarRow[] =>
  summary.byPerson.map((person) => ({
    key: person.name,
    label: person.name,
    value: moneyToCents(person.cmvTotal),
    primary: formatMoney(person.cmvTotal),
    secondary: countLabel(person.count, 'lançamento', 'lançamentos'),
  }));

const itemRows = (summary: StaffConsumptionSummary): BarRow[] =>
  summary.topItems.map((item) => ({
    key: `${item.categoryName}|${item.name}`,
    label: item.name,
    detail: item.categoryName,
    value: item.quantity,
    primary: `${item.quantity} un`,
  }));

/** O custo do período em destaque e, ao lado, quantos lançamentos e o que ficou sem custo. */
function StaffTotal({ summary }: { summary: StaffConsumptionSummary }) {
  const missing = summary.missingCostCount;
  return (
    <p className="staff-total">
      <strong>{formatMoney(summary.cmvTotal)}</strong>
      <span>
        em {countLabel(summary.count, 'lançamento', 'lançamentos')}
        {missing > 0 &&
          `; ${countLabel(missing, 'item sem custo', 'itens sem custo')} (açaí)`}
      </span>
    </p>
  );
}

/**
 * Consumo interno do período (2026-10-23): quanto a equipe consumiu pelo custo dos itens, quem
 * consumiu mais e o que mais saiu. Fica fora das vendas e dos gastos.
 */
export function StaffConsumptionSection({
  report,
}: {
  report: AnalyticsReport;
}) {
  const summary = report.staffConsumption;
  return (
    <AnalyticsSection
      title="Consumo interno"
      note="Pelo custo dos itens; fora das vendas e dos gastos."
    >
      {summary.count === 0 ? (
        <p className="analytics-empty">Nenhum consumo interno no período.</p>
      ) : (
        <>
          <StaffTotal summary={summary} />
          <h3 className="analytics-subtitle">Por pessoa</h3>
          <BarList rows={personRows(summary)} empty="" label="Por pessoa" />
          <h3 className="analytics-subtitle">Itens mais consumidos</h3>
          <BarList
            rows={itemRows(summary)}
            empty=""
            label="Itens mais consumidos"
          />
        </>
      )}
    </AnalyticsSection>
  );
}
