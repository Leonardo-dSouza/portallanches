import { useMemo, useState } from 'react';
import type {
  CostProduct,
  CostSheetView,
  PricingCategory,
  ProductCostView,
} from '../api/cost-types';
import { CategoryRuler } from './CategoryRuler';
import { sortForCategory } from './price-split';
import { ProductAccount } from './ProductAccount';
import { ProductCostRow } from './ProductCostRow';
import { RecipeReceipt } from './RecipeReceipt';
import {
  countByStatus,
  filterByStatus,
  type StatusFilter,
} from './status-filter';
import type { CostDraft } from './use-cost-draft';

export interface CategoryCostTabProps {
  category: PricingCategory;
  view: CostSheetView;
  draft: CostDraft;
}

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  near: 'Perto da meta',
  below: 'Abaixo da meta',
  incomplete: 'Sem custo completo',
};

function FilterKeys(props: {
  products: ProductCostView[];
  hasTarget: boolean;
  active: StatusFilter;
  onSelect(filter: StatusFilter): void;
}) {
  const counts = countByStatus(props.products);
  const keys: StatusFilter[] = props.hasTarget
    ? ['all', 'near', 'below']
    : ['all'];
  if (counts.incomplete > 0) keys.push('incomplete');
  return (
    <div className="cost-filter" role="group" aria-label="Filtrar lanches">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          className="toggle-key toggle-key-sm toggle-key-brand"
          aria-pressed={props.active === key}
          onClick={() => props.onSelect(key)}
        >
          {FILTER_LABELS[key]}
          <span className="toggle-key-count">{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}

function Legend({ hasTarget }: { hasTarget: boolean }) {
  return (
    <ul className="cost-legend" aria-label="Cores da barra">
      <li className="is-supplies">insumos</li>
      {hasTarget && <li className="is-fixed">custo fixo</li>}
      <li className="is-profit">{hasTarget ? 'lucro' : 'sobra'}</li>
      {hasTarget && (
        <li className="is-below">lucro mais de 2 pontos abaixo da meta</li>
      )}
      {hasTarget && <li className="is-mark">meta de lucro</li>}
    </ul>
  );
}

function ListHeader({ hasTarget }: { hasTarget: boolean }) {
  return (
    <div className="cost-list-head" aria-hidden="true">
      <span>Nº</span>
      <span>Lanche</span>
      <span className="num">Custo</span>
      <span className="num">Preço hoje</span>
      <span>Para onde vai o preço</span>
      <span>{hasTarget ? 'Lucro' : 'Sobra'}</span>
      <span>{hasTarget ? 'Preço sugerido' : ''}</span>
    </div>
  );
}

interface DetailProps {
  view: ProductCostView;
  product: CostProduct | undefined;
  category: PricingCategory;
  sheet: CostSheetView;
  draft: CostDraft;
}

/** O que abre embaixo da linha: a receita (cupom) e a conta; combo explica de onde vem o custo. */
function ProductDetail({ view, product, category, sheet, draft }: DetailProps) {
  const isCombo = (product?.bundleItems.length ?? 0) > 0;
  const changed = draft.changes.components.find((c) => c.productId === view.id);
  const items = changed?.components ?? product?.components ?? [];
  return (
    <div className="cost-detail">
      {isCombo ? (
        <p className="card cost-combo-note">
          Combo: o custo vem dos itens do combo. A receita de cada item fica na
          aba dele.
        </p>
      ) : (
        <RecipeReceipt
          productName={view.name}
          items={items}
          supplies={sheet.snapshot.supplies}
          cmv={view.cmv}
          onChange={(components) =>
            draft.setComponents({ productId: view.id, components })
          }
        />
      )}
      <ProductAccount
        view={view}
        category={category}
        ifood={sheet.snapshot.ifood}
        draft={draft}
      />
    </div>
  );
}

/**
 * Aba de uma categoria em Custos (2026-11-18): a régua de cada R$ 10, o filtro pelo estado da meta e
 * uma linha por lanche com a barra de para onde vai o preço; a linha abre a receita e a conta.
 * Só calcula: o preço do cardápio muda em Cadastros.
 *
 * @example <CategoryCostTab category={tradicional} view={view} draft={draft} />
 */
export function CategoryCostTab({
  category,
  view,
  draft,
}: CategoryCostTabProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const hasTarget =
    category.fixedCostPercent !== null && category.profitPercent !== null;
  const rows = useMemo(
    () => sortForCategory(view.products, category.id),
    [view.products, category.id],
  );
  const products = useMemo(
    () => new Map(view.snapshot.products.map((p) => [p.id, p])),
    [view.snapshot.products],
  );
  const visible = filterByStatus(rows, filter);
  const changedIds = new Set(draft.changes.components.map((c) => c.productId));
  return (
    <div className="cost-category">
      <CategoryRuler category={category} products={rows} />
      <div className="cost-toolbar">
        <FilterKeys
          products={rows}
          hasTarget={hasTarget}
          active={filter}
          onSelect={setFilter}
        />
        <Legend hasTarget={hasTarget} />
      </div>
      <div
        className={`card card-flush cost-list ${hasTarget ? '' : 'is-plain'}`}
      >
        <ListHeader hasTarget={hasTarget} />
        <ul>
          {visible.map((row) => (
            <li key={row.id} className="cost-list-item">
              <ProductCostRow
                view={row}
                open={openId === row.id}
                changed={changedIds.has(row.id)}
                detailId={`cost-detail-${row.id}`}
                onToggle={() =>
                  setOpenId((prev) => (prev === row.id ? null : row.id))
                }
              />
              {openId === row.id && (
                <div id={`cost-detail-${row.id}`}>
                  <ProductDetail
                    view={row}
                    product={products.get(row.id)}
                    category={category}
                    sheet={view}
                    draft={draft}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        {visible.length === 0 && (
          <p className="cost-list-empty">Nenhum lanche nesta tecla.</p>
        )}
      </div>
    </div>
  );
}
