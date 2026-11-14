import { Fragment, useMemo, useState } from 'react';
import type {
  CostProduct,
  CostSheetView,
  PricingCategory,
  ProductCostView,
} from '../api/cost-types';
import { formatMoney } from '../api/money';
import { ProductRecipeRows } from './ProductRecipeRows';
import type { CostDraft } from './use-cost-draft';

export interface CategoryCostTabProps {
  category: PricingCategory;
  view: CostSheetView;
  draft: CostDraft;
}

function parsePercentToHundredths(percent: string): bigint {
  const [intPart, decPart = ''] = percent.split('.');
  return BigInt(intPart) * 100n + BigInt(decPart.padEnd(2, '0').slice(0, 2));
}

function computeDivisorText(
  fixedCostPercent: string,
  profitPercent: string,
): string {
  const fixedHundredths = parsePercentToHundredths(fixedCostPercent);
  const profitHundredths = parsePercentToHundredths(profitPercent);
  const divisorScaled = 10000n - fixedHundredths - profitHundredths;
  const intPart = divisorScaled / 10000n;
  const decPart = (divisorScaled % 10000n).toString().padStart(4, '0');
  return `${intPart},${decPart}`;
}

function sortCategoryProducts(
  products: ProductCostView[],
  categoryId: number,
): ProductCostView[] {
  const filtered = products.filter((p) => p.categoryId === categoryId);
  return filtered.sort((a, b) => {
    if (a.menuNumber !== null && b.menuNumber !== null) {
      if (a.menuNumber !== b.menuNumber) return a.menuNumber - b.menuNumber;
    } else if (a.menuNumber !== null) {
      return -1;
    } else if (b.menuNumber !== null) {
      return 1;
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

interface BannerProps {
  category: PricingCategory;
}

function CategoryBanner({ category }: BannerProps) {
  const hasPercentages =
    category.fixedCostPercent !== null && category.profitPercent !== null;

  if (!hasPercentages) {
    return (
      <div className="p-3 bg-surface border border-line rounded-control text-sm text-muted">
        Sem meta de lucro nesta categoria: mostra o lucro bruto (preço − custo).
      </div>
    );
  }

  const fixed = category.fixedCostPercent!;
  const profit = category.profitPercent!;
  const divisor = computeDivisorText(fixed, profit);
  const fixedDisplay = fixed.replace(/\.00$/, '').replace('.', ',');
  const profitDisplay = profit.replace(/\.00$/, '').replace('.', ',');

  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-surface border border-line rounded-control text-sm">
      <div>
        <span className="block text-xs uppercase text-muted font-semibold">
          Custo fixo
        </span>
        <strong className="font-display text-lg">{fixedDisplay}%</strong>
      </div>
      <div>
        <span className="block text-xs uppercase text-muted font-semibold">
          Lucro desejado
        </span>
        <strong className="font-display text-lg">{profitDisplay}%</strong>
      </div>
      <div>
        <span className="block text-xs uppercase text-muted font-semibold">
          Divisor
        </span>
        <strong className="font-display text-lg">{divisor}</strong>
      </div>
      <div className="flex-1 text-muted text-xs">
        PV = CMV ÷ {divisor}, arredondado para cima em R$ 0,10. Valem para todos
        os lanches.
      </div>
      <a href="/cadastros" className="button button-secondary button-sm">
        Alterar em Cadastros
      </a>
    </div>
  );
}

interface ProductRowProps {
  product: ProductCostView;
  snapshotProduct: CostProduct | undefined;
  hasPercentages: boolean;
  isOpen: boolean;
  isChanged: boolean;
  onToggleRecipe(): void;
  onUsePv(pv: string): void;
}

function ProductRow({
  product,
  snapshotProduct,
  hasPercentages,
  isOpen,
  isChanged,
  onToggleRecipe,
  onUsePv,
}: ProductRowProps) {
  const isCombo = Boolean(
    snapshotProduct &&
    snapshotProduct.bundleItems &&
    snapshotProduct.bundleItems.length > 0,
  );
  const canUsePv =
    !isCombo && product.pv !== null && product.pv !== product.salePrice;
  const isZeroCostIncomplete =
    (product.cmv === '0.00' || product.cmv === '0') && !product.cmvComplete;

  const rowClass = `${isChanged ? 'bg-brand-soft font-semibold' : ''} ${isOpen ? 'bg-sunken' : ''}`;

  if (!hasPercentages) {
    return (
      <tr className={rowClass}>
        <td className="num">{product.menuNumber ?? '—'}</td>
        <td>{product.name}</td>
        <td className="num">
          {product.cmv ? formatMoney(product.cmv) : '—'}
          {isZeroCostIncomplete && (
            <span className="tag text-xs ml-1">sem custo</span>
          )}
        </td>
        <td className="num">
          {product.salePrice ? formatMoney(product.salePrice) : '—'}
        </td>
        <td className="num">
          {product.cmvPercent
            ? `${product.cmvPercent.replace('.', ',')}%`
            : '—'}
        </td>
        <td className="num">
          {product.profit ? formatMoney(product.profit) : '—'}
        </td>
        <td className="text-right">
          {isCombo ? (
            <span className="tag text-xs">combo</span>
          ) : (
            <button
              type="button"
              className="button-ghost button-sm"
              onClick={onToggleRecipe}
            >
              {isOpen ? 'Fechar receita' : 'Receita'}
            </button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr className={rowClass}>
      <td className="num">{product.menuNumber ?? '—'}</td>
      <td>{product.name}</td>
      <td className="num">
        {product.cmv ? formatMoney(product.cmv) : '—'}
        {!product.cmvComplete && (
          <span className="tag tag-danger text-xs ml-1">incompleto</span>
        )}
      </td>
      <td className="num">
        {product.cmvPercent ? `${product.cmvPercent.replace('.', ',')}%` : '—'}
      </td>
      <td className="num">
        {product.salePrice ? formatMoney(product.salePrice) : '—'}
      </td>
      <td className="num">
        {product.pv ? formatMoney(product.pv) : '—'}
        {product.belowTarget && (
          <span className="tag tag-danger text-xs ml-1">lucro &lt; meta</span>
        )}
      </td>
      <td className="num">
        {product.ifoodPv ? formatMoney(product.ifoodPv) : '—'}
      </td>
      <td className="num">
        {product.profit ? formatMoney(product.profit) : '—'}
      </td>
      <td className="num">
        {product.marginPercent
          ? `${product.marginPercent.replace('.', ',')}%`
          : '—'}
      </td>
      <td className="text-right whitespace-nowrap">
        {isCombo ? (
          <span className="tag text-xs">combo</span>
        ) : (
          <span className="inline-flex items-center gap-1">
            {canUsePv && (
              <button
                type="button"
                className="button-ghost button-sm"
                onClick={() => onUsePv(product.pv!)}
              >
                Usar PV
              </button>
            )}
            <button
              type="button"
              className="button-ghost button-sm"
              onClick={onToggleRecipe}
            >
              {isOpen ? 'Fechar receita' : 'Receita'}
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}

/**
 * Aba de custos de uma categoria com precificação, margem, PV e edição de receita por produto.
 *
 * @example <CategoryCostTab category={cat} view={view} draft={draft} />
 */
export function CategoryCostTab({
  category,
  view,
  draft,
}: CategoryCostTabProps) {
  const [openRecipeId, setOpenRecipeId] = useState<number | null>(null);

  const hasPercentages =
    category.fixedCostPercent !== null && category.profitPercent !== null;

  const sortedProducts = useMemo(
    () => sortCategoryProducts(view.products, category.id),
    [view.products, category.id],
  );

  const snapshotMap = useMemo(
    () => new Map(view.snapshot.products.map((p) => [p.id, p])),
    [view.snapshot.products],
  );

  const handleToggleRecipe = (id: number) => {
    setOpenRecipeId((prev) => (prev === id ? null : id));
  };

  const handleUsePv = (productId: number, pv: string) => {
    draft.setSalePrice({ productId, salePrice: pv });
  };

  const getProductComponents = (productId: number) => {
    const draftComp = draft.changes.components.find(
      (c) => c.productId === productId,
    );
    if (draftComp) return draftComp.components;
    return snapshotMap.get(productId)?.components ?? [];
  };

  const colSpan = hasPercentages ? 10 : 7;
  const profitPercentText = category.profitPercent
    ? category.profitPercent.replace(/\.00$/, '').replace('.', ',')
    : null;

  return (
    <div className="flex flex-col gap-4">
      <CategoryBanner category={category} />

      <div className="card card-flush">
        <div className="table-scroll">
          <table className="table">
            <thead>
              {hasPercentages ? (
                <tr>
                  <th className="num">Nº</th>
                  <th>Lanche</th>
                  <th className="num">CMV</th>
                  <th className="num">CMV %</th>
                  <th className="num">Preço</th>
                  <th className="num">
                    PV
                    <span className="block text-[10px] text-muted font-normal normal-case">
                      preço p/ {profitPercentText}% de lucro
                    </span>
                  </th>
                  <th className="num">PV iFood</th>
                  <th className="num">Lucro</th>
                  <th className="num">Margem</th>
                  <th className="text-right">Ações</th>
                </tr>
              ) : (
                <tr>
                  <th className="num">Nº</th>
                  <th>Item</th>
                  <th className="num">Custo (CMV)</th>
                  <th className="num">Preço de venda</th>
                  <th className="num">CMV %</th>
                  <th className="num">Lucro bruto</th>
                  <th className="text-right">Ações</th>
                </tr>
              )}
            </thead>
            <tbody>
              {sortedProducts.map((product) => {
                const isOpen = openRecipeId === product.id;
                const isChanged =
                  draft.changes.salePrices.some(
                    (s) => s.productId === product.id,
                  ) ||
                  draft.changes.components.some(
                    (c) => c.productId === product.id,
                  );
                const snapshotProd = snapshotMap.get(product.id);
                const isCombo = Boolean(
                  snapshotProd &&
                  snapshotProd.bundleItems &&
                  snapshotProd.bundleItems.length > 0,
                );

                return (
                  <Fragment key={product.id}>
                    <ProductRow
                      product={product}
                      snapshotProduct={snapshotProd}
                      hasPercentages={hasPercentages}
                      isOpen={isOpen}
                      isChanged={isChanged}
                      onToggleRecipe={() => handleToggleRecipe(product.id)}
                      onUsePv={(pv) => handleUsePv(product.id, pv)}
                    />
                    {isOpen && !isCombo && (
                      <tr className="bg-sunken">
                        <td colSpan={colSpan} className="p-3">
                          <ProductRecipeRows
                            productId={product.id}
                            components={getProductComponents(product.id)}
                            supplies={view.snapshot.supplies}
                            onChange={(items) =>
                              draft.setComponents({
                                productId: product.id,
                                components: items,
                              })
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
