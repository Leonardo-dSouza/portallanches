import type { AnalyticsReport } from '../api/analytics-types';
import { formatMoney } from '../api/money';
import { AnalyticsSection } from './AnalyticsSection';
import { BarList } from './BarList';
import { CategoryList } from './CategoryList';

/** O que mais sai: todos os itens da comanda (bebidas também), por quantidade. */
export function TopProductsSection({
  report,
}: {
  report: Pick<AnalyticsReport, 'topProducts'>;
}) {
  return (
    <AnalyticsSection
      title="Lanches mais vendidos"
      note="Todos os itens da comanda, por quantidade."
    >
      <BarList
        empty="Nenhum item vendido no período."
        rows={report.topProducts.map((product) => ({
          key: product.productId,
          label: product.name,
          detail: product.categoryName,
          value: product.quantity,
          primary: `${product.quantity} un`,
          secondary: formatMoney(product.revenue),
        }))}
      />
    </AnalyticsSection>
  );
}

/** O peso de cada categoria do cardápio, com os itens dela ao clicar. */
export function CategorySection({
  report,
}: {
  report: Pick<AnalyticsReport, 'byCategory'>;
}) {
  return (
    <AnalyticsSection
      title="Vendas por categoria"
      note="Na ordem do cardápio. Clique numa categoria para ver os itens dela."
    >
      <CategoryList categories={report.byCategory} />
    </AnalyticsSection>
  );
}
