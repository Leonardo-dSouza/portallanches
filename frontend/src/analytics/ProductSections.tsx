import type { AnalyticsReport } from '../api/analytics-types';
import { formatMoney } from '../api/money';
import { AnalyticsSection } from './AnalyticsSection';
import { BarList } from './BarList';
import { CategoryList } from './CategoryList';

type ProductData = Pick<AnalyticsReport, 'topProducts' | 'byCategory'>;

/** O que mais sai e o peso de cada categoria (com os itens dela ao clicar). */
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
        title="Vendas por categoria"
        note="Na ordem do cardápio. Clique numa categoria para ver os itens dela."
      >
        <CategoryList categories={report.byCategory} />
      </AnalyticsSection>
    </>
  );
}
