import { ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';
import type { CategorySales } from '../api/analytics-types';
import { formatMoney } from '../api/money';
import { barShare, moneyBar } from './analytics-format';

function CategoryItems({
  id,
  category,
}: {
  id: string;
  category: CategorySales;
}) {
  return (
    <ol id={id} className="category-items">
      {category.products.map((product) => (
        <li key={product.productId}>
          <span>{product.name}</span>
          <strong>{product.quantity} un</strong>
          <span className="category-items-revenue">
            {formatMoney(product.revenue)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Vendas por categoria na ordem do cardápio (a API já tira as zeradas). Cada categoria é um
 * botão que abre os itens dela, do que mais saiu ao que menos; várias podem ficar abertas.
 */
export function CategoryList({ categories }: { categories: CategorySales[] }) {
  const idPrefix = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  if (categories.length === 0)
    return <p className="analytics-empty">Nenhum item vendido no período.</p>;
  const max = Math.max(...categories.map((c) => moneyBar(c.revenue)));
  const toggle = (name: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(name)) next.add(name);
      return next;
    });
  return (
    <ul className="category-list">
      {categories.map((category, index) => {
        const isOpen = open.has(category.categoryName);
        const panelId = `${idPrefix}-${index}`;
        return (
          <li key={category.categoryName}>
            <button
              type="button"
              className="category-row"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(category.categoryName)}
            >
              <ChevronRight aria-hidden className="category-chevron" />
              <span className="bar-list-name">{category.categoryName}</span>
              <span className="bar-list-figures">
                <strong>{formatMoney(category.revenue)}</strong>
                <span>{category.quantity} un</span>
              </span>
              <span className="bar-list-track" aria-hidden>
                <span
                  style={{ width: barShare(moneyBar(category.revenue), max) }}
                />
              </span>
            </button>
            {isOpen && <CategoryItems id={panelId} category={category} />}
          </li>
        );
      })}
    </ul>
  );
}
