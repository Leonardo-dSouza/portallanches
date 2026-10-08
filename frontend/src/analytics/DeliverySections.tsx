import type { AnalyticsReport } from '../api/analytics-types';
import { formatMoney } from '../api/money';
import { countLabel } from './analytics-format';
import { AnalyticsSection } from './AnalyticsSection';
import { BarList } from './BarList';

/** Para onde mais se entrega (só entregas têm bairro). */
export function NeighborhoodSection({
  report,
}: {
  report: Pick<AnalyticsReport, 'topNeighborhoods'>;
}) {
  return (
    <AnalyticsSection title="Bairros com mais entregas">
      <BarList
        empty="Nenhuma entrega no período."
        rows={report.topNeighborhoods.map((zone) => ({
          key: zone.neighborhood,
          label: zone.neighborhood,
          value: zone.deliveries,
          primary: countLabel(zone.deliveries, 'entrega', 'entregas'),
          secondary: formatMoney(zone.revenue),
        }))}
      />
    </AnalyticsSection>
  );
}

/** Quem mais pede (só entregas têm cliente), com o total gasto. */
export function CustomerSection({
  report,
}: {
  report: Pick<AnalyticsReport, 'topCustomers'>;
}) {
  return (
    <AnalyticsSection
      title="Clientes que mais pedem"
      note="Entregas, com o total gasto no período."
    >
      <BarList
        empty="Nenhuma entrega no período."
        rows={report.topCustomers.map((customer) => ({
          key: customer.customerId,
          label: customer.name,
          value: customer.orders,
          primary: countLabel(customer.orders, 'pedido', 'pedidos'),
          secondary: formatMoney(customer.revenue),
        }))}
      />
    </AnalyticsSection>
  );
}
