import { useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { createCostApi } from '../api/cost-api';
import type { CostSheetView } from '../api/cost-types';
import { formatMoney } from '../api/money';
import { SubSections } from '../components/SubSections';
import { CategoryCostTab } from '../costs/CategoryCostTab';
import { DraftBar } from '../costs/DraftBar';
import { ProductionTab } from '../costs/ProductionTab';
import { SaveCostsDialog } from '../costs/SaveCostsDialog';
import { useCostDraft, type CostDraft } from '../costs/use-cost-draft';

/** Propriedades compartilhadas por todas as sub-abas da tela de custos. */
export interface CostTabProps {
  view: CostSheetView;
  draft: CostDraft;
}

function SuppliesTab({ view }: CostTabProps) {
  return (
    <div className="card card-flush">
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Insumo</th>
              <th className="num">Custo por unidade</th>
            </tr>
          </thead>
          <tbody>
            {view.snapshot.supplies.map((supply) => (
              <tr key={supply.id}>
                <td>{supply.name}</td>
                <td className="num">
                  {supply.unitCost ? formatMoney(supply.unitCost) : '—'} /
                  {supply.countUnit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
            As abas da planilha, dentro do sistema. Nada vale até você salvar.
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
              render: () => <SuppliesTab view={view} draft={draft} />,
            },
            {
              id: 'production',
              label: 'Produção',
              render: () => <ProductionTab view={view} draft={draft} />,
            },
            ...view.snapshot.categories.map((category) => ({
              id: `category-${category.id}`,
              label: category.name,
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
