import { useMemo, useState } from 'react';
import type {
  CostSheetView,
  CostSupply,
  SupplyRecipe,
} from '../api/cost-types';
import { Dialog } from '../components/Dialog';
import { RecipeCard } from './RecipeCard';
import type { CostDraft } from './use-cost-draft';

export interface ProductionTabProps {
  view: CostSheetView;
  draft: CostDraft;
}

interface NewRecipeModalProps {
  supplies: CostSupply[];
  onSelect(supplyId: number): void;
  onClose(): void;
}

function NewRecipeModal({ supplies, onSelect, onClose }: NewRecipeModalProps) {
  return (
    <Dialog title="Nova ficha de produção" onClose={onClose}>
      <p className="hint mb-3">
        Escolha o insumo artesanal que será produzido na casa:
      </p>
      <ul className="max-h-60 overflow-y-auto divide-y divide-line text-sm mb-4">
        {supplies.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="w-full text-left p-2 hover:bg-sunken rounded flex justify-between"
              onClick={() => onSelect(s.id)}
            >
              <span>{s.name}</span>
              <span className="text-muted text-xs">{s.countUnit}</span>
            </button>
          </li>
        ))}
        {supplies.length === 0 && (
          <li className="p-3 text-muted text-sm text-center">
            Nenhum insumo disponível para criar ficha.
          </li>
        )}
      </ul>
      <footer className="dialog-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
        >
          Cancelar
        </button>
      </footer>
    </Dialog>
  );
}

/**
 * Produção vazia: o que é a ficha, com o hambúrguer artesanal da planilha como exemplo, e a tecla
 * para criar a primeira (2026-11-18).
 */
function EmptyProduction({ onCreate }: { onCreate(): void }) {
  return (
    <section className="card production-empty">
      <h2>Nenhuma ficha de produção ainda</h2>
      <p>
        Ficha de produção é para o que a casa faz: hambúrguer artesanal, molho
        verde, vinagrete. Você diz os ingredientes e quanto a receita rende, e o
        sistema calcula o custo de cada unidade. Esse custo entra nos lanches
        que usam o item.
      </p>
      <p className="production-example">
        <span>Exemplo da planilha:</span>
        <span>ingredientes R$ 173,42</span>
        <span aria-hidden="true">÷</span>
        <span>rende 28 un</span>
        <span aria-hidden="true">=</span>
        <strong>R$ 6,19 por hambúrguer de 150 g</strong>
      </p>
      <button type="button" className="button" onClick={onCreate}>
        Criar a primeira ficha
      </button>
    </section>
  );
}

function resolveVisibleRecipes(
  baseRecipes: SupplyRecipe[],
  draftRecipes: SupplyRecipe[],
  removedIds: number[],
  pending: SupplyRecipe[],
): SupplyRecipe[] {
  const removedSet = new Set(removedIds);
  const map = new Map<number, SupplyRecipe>();
  for (const r of baseRecipes) {
    if (!removedSet.has(r.supplyId)) map.set(r.supplyId, r);
  }
  for (const r of draftRecipes) {
    if (!removedSet.has(r.supplyId)) map.set(r.supplyId, r);
  }
  for (const r of pending) {
    if (!map.has(r.supplyId) && !removedSet.has(r.supplyId)) {
      map.set(r.supplyId, r);
    }
  }
  return Array.from(map.values());
}

/**
 * Aba de Produção: grade de fichas técnicas de insumos artesanais com rendimento e ingredientes.
 *
 * @example <ProductionTab view={view} draft={draft} />
 */
export function ProductionTab({ view, draft }: ProductionTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingNewRecipes, setPendingNewRecipes] = useState<SupplyRecipe[]>(
    [],
  );

  const visibleRecipes = useMemo(
    () =>
      resolveVisibleRecipes(
        view.snapshot.recipes,
        draft.changes.recipes,
        draft.changes.removedRecipeSupplyIds,
        pendingNewRecipes,
      ),
    [
      view.snapshot.recipes,
      draft.changes.recipes,
      draft.changes.removedRecipeSupplyIds,
      pendingNewRecipes,
    ],
  );

  const eligibleSupplies = useMemo(() => {
    const recipeIds = new Set(visibleRecipes.map((r) => r.supplyId));
    const ingredientIds = new Set(
      visibleRecipes.flatMap((r) => r.items.map((i) => i.supplyId)),
    );
    return view.snapshot.supplies.filter(
      (s) => !recipeIds.has(s.id) && !ingredientIds.has(s.id),
    );
  }, [view.snapshot.supplies, visibleRecipes]);

  const handleSelectNewSupply = (supplyId: number) => {
    setPendingNewRecipes((prev) => [
      ...prev,
      { supplyId, yieldQuantity: '1', items: [] },
    ]);
    setModalOpen(false);
  };

  const handleSetRecipe = (recipe: SupplyRecipe) => {
    if (recipe.items.length === 0) {
      setPendingNewRecipes((prev) =>
        prev.map((p) => (p.supplyId === recipe.supplyId ? recipe : p)),
      );
      return;
    }
    setPendingNewRecipes((prev) =>
      prev.filter((p) => p.supplyId !== recipe.supplyId),
    );
    draft.setRecipe(recipe);
  };

  const handleRemoveRecipe = (supplyId: number) => {
    setPendingNewRecipes((prev) => prev.filter((p) => p.supplyId !== supplyId));
    draft.removeRecipe(supplyId);
  };

  const cardDraft = useMemo(
    () => ({
      setRecipe: handleSetRecipe,
      removeRecipe: handleRemoveRecipe,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.setRecipe, draft.removeRecipe],
  );

  return (
    <div className="flex flex-col gap-4">
      {visibleRecipes.length === 0 ? (
        <EmptyProduction onCreate={() => setModalOpen(true)} />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="text-muted text-sm">
              Fichas de produção: o que a casa faz vira um insumo com custo
              calculado.
            </p>
            <button
              type="button"
              className="button button-sm"
              onClick={() => setModalOpen(true)}
            >
              Nova ficha
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.supplyId}
                recipe={recipe}
                view={view}
                sheet={draft.sheet}
                allRecipes={visibleRecipes}
                draft={cardDraft}
              />
            ))}
          </div>
        </>
      )}
      <p className="text-muted text-sm">
        Produzir não baixa estoque: a ficha só calcula o custo.
      </p>
      {modalOpen && (
        <NewRecipeModal
          supplies={eligibleSupplies}
          onSelect={handleSelectNewSupply}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
