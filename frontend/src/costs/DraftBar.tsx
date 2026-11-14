import type { CostImpact } from '../api/cost-types';

export interface DraftBarProps {
  count: number;
  impact?: CostImpact | null;
  recipeSupplyIds?: Set<number>;
  recipeCount?: number;
  productCount?: number;
  summary?: string;
  onDiscard(): void;
  onReview(): void;
}

function resolveCounts(props: DraftBarProps): {
  recipes: number;
  products: number;
} {
  const products = props.productCount ?? props.impact?.products.length ?? 0;
  if (props.recipeCount !== undefined) {
    return { recipes: props.recipeCount, products };
  }
  const recipeIds = props.recipeSupplyIds;
  const supplies = props.impact?.supplies ?? [];
  const recipes = recipeIds
    ? supplies.filter((s) => recipeIds.has(s.supplyId)).length
    : 0;
  return { recipes, products };
}

function formatImpactSummary(recipes: number, products: number): string | null {
  if (recipes === 0 && products === 0) return null;
  const recipeText =
    recipes === 1 ? '1 ficha de produção' : `${recipes} fichas de produção`;
  const productText = products === 1 ? '1 lanche' : `${products} lanches`;
  if (recipes > 0 && products > 0) {
    return `Muda ${recipeText} e o CMV de ${productText}.`;
  }
  return recipes > 0 ? `Muda ${recipeText}.` : `Muda o CMV de ${productText}.`;
}

/**
 * Faixa superior mostarda exibida quando há alterações não salvas no rascunho de custos.
 *
 * @example <DraftBar count={2} onDiscard={draft.discard} onReview={openReview} />
 */
export function DraftBar(props: DraftBarProps) {
  const { count, summary: explicitSummary, onDiscard, onReview } = props;
  if (count <= 0) return null;

  const { recipes, products } = resolveCounts(props);
  const summary = explicitSummary ?? formatImpactSummary(recipes, products);
  const countText =
    count === 1
      ? 'Rascunho · 1 alteração não salva.'
      : `Rascunho · ${count} alterações não salvas.`;

  return (
    <aside className="draft-bar" role="status">
      <div className="draft-bar-what">
        <strong>{countText}</strong>
        {summary && <span className="draft-bar-summary"> {summary}</span>}
      </div>
      <div className="draft-bar-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onDiscard}
        >
          Descartar
        </button>
        <button type="button" className="button" onClick={onReview}>
          Ver impacto e salvar
        </button>
      </div>
    </aside>
  );
}
