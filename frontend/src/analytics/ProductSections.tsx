import type { AnalyticsReport } from '../api/analytics-types';
import { formatMoney } from '../api/money';
import { moneyBar } from './analytics-format';
import { AnalyticsSection } from './AnalyticsSection';
import { BarList } from './BarList';
import { LeastSoldList } from './LeastSoldList';

type ProductData = Pick<
  AnalyticsReport,
  'topProducts' | 'leastSoldLanches' | 'byCategory'
>;

/** O que mais sai, o que quase não sai e o peso de cada categoria. */
export function ProductSections({ report }: { report: ProductData }) {
  return (
    <>
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
      <AnalyticsSection
        title="Lanches que menos vendem"
        note="Lanches ativos do cardápio, os que não saíram primeiro."
      >
        <LeastSoldList lanches={report.leastSoldLanches} />
      </AnalyticsSection>
      <AnalyticsSection title="Vendas por categoria">
        <BarList
          empty="Nenhum item vendido no período."
          rows={report.byCategory.map((category) => ({
            key: category.categoryName,
            label: category.categoryName,
            value: moneyBar(category.revenue),
            primary: formatMoney(category.revenue),
            secondary: `${category.quantity} un`,
          }))}
        />
      </AnalyticsSection>
    </>
  );
}
