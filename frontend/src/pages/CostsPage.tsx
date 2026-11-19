import { useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { createCostApi } from '../api/cost-api';
import type { CostSheetView } from '../api/cost-types';
import { SubSections } from '../components/SubSections';
import { CategoryCostTab } from '../costs/CategoryCostTab';
import { DraftBar } from '../costs/DraftBar';
import { ProductionTab } from '../costs/ProductionTab';
import { SaveCostsDialog } from '../costs/SaveCostsDialog';
import { belowTargetCount } from '../costs/status-filter';
import { SuppliesCostTab } from '../costs/SuppliesCostTab';
import { useCostDraft, type CostDraft } from '../costs/use-cost-draft';

/** Propriedades compartilhadas por todas as sub-abas da tela de custos. */
export interface CostTabProps {
  view: CostSheetView;
  draft: CostDraft;
}

/**
 * Tela de Custos do administrador: rascunho de custos, impacto antes/depois e sub-abas da planilha.
 *
 * @example <CostsPage />
 */
export function CostsPage() {
  const api = useApi();
  const costApi = useMemo(() => createCostApi(api), [api]);
  const draft = useCostDraft(costApi);
  const [saveOpen, setSaveOpen] = useState(false);

  const view = draft.preview ?? draft.sheet;
  const recipeIds = useMemo(
    () => new Set(draft.sheet?.snapshot.recipes.map((r) => r.supplyId) ?? []),
    [draft.sheet],
  );

  return (
    <section className="costs-page">
      <header className="cash-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Custos</h1>
          <p className="hint">
            Quanto custa fazer cada lanche, por quanto ele deveria sair e quanto
            sobra para você. Aqui só se calcula: o preço do cardápio muda em
            Cadastros.
          </p>
        </div>
      </header>

      <DraftBar
        count={draft.changeCount}
        impact={draft.preview?.impact}
        recipeSupplyIds={recipeIds}
        onDiscard={draft.discard}
        onReview={() => setSaveOpen(true)}
      />

      {view ? (
        <SubSections
          sections={[
            {
              id: 'supplies',
              label: 'Insumos',
              render: () => <SuppliesCostTab view={view} draft={draft} />,
            },
            {
              id: 'production',
              label: 'Produção',
              render: () => <ProductionTab view={view} draft={draft} />,
            },
            ...view.snapshot.categories.map((category) => ({
              id: `category-${category.id}`,
              label: category.name,
              count: belowTargetCount(view, category.id),
              render: () => (
                <CategoryCostTab
                  category={category}
                  view={view}
                  draft={draft}
                />
              ),
            })),
          ]}
        />
      ) : (
        <div className="skeleton">
          <div className="skeleton-line" />
        </div>
      )}

      {saveOpen && (
        <SaveCostsDialog draft={draft} onClose={() => setSaveOpen(false)} />
      )}
    </section>
  );
}
