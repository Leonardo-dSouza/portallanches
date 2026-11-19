import { useMemo, useState } from 'react';
import type {
  CostSheetView,
  RecipeItem,
  SupplyRecipe,
} from '../api/cost-types';
import { centsToMoney, formatMoney, moneyToCents } from '../api/money';
import { formatQuantity } from '../api/quantity';
import { Dialog } from '../components/Dialog';
import {
  computeIngredientSubtotal,
  parseValidQuantity,
} from './ingredient-items';
import { IngredientRows } from './IngredientRows';
import type { CostDraft } from './use-cost-draft';

export interface RecipeCardProps {
  recipe: SupplyRecipe;
  view: CostSheetView;
  sheet?: CostSheetView | null;
  allRecipes: SupplyRecipe[];
  draft: Pick<CostDraft, 'setRecipe' | 'removeRecipe'>;
}

function countProductUsages(
  products: CostSheetView['snapshot']['products'],
  supplyId: number,
): number {
  return products.filter((p) =>
    p.components.some((c) => c.supplyId === supplyId),
  ).length;
}

function formatTwoDecimals(val: string): string {
  const [intPart, decPart = '00'] = val.split('.');
  return `${intPart},${decPart.padEnd(2, '0').slice(0, 2)}`;
}

function computeRecipeTotal(
  items: RecipeItem[],
  supplies: CostSheetView['snapshot']['supplies'],
): string {
  const supplyMap = new Map(supplies.map((s) => [s.id, s]));
  let totalCents = 0;
  for (const item of items) {
    const supply = supplyMap.get(item.supplyId);
    const subtotal = computeIngredientSubtotal(
      item.quantity,
      supply?.unitCost ?? null,
    );
    if (subtotal) totalCents += moneyToCents(subtotal);
  }
  return centsToMoney(totalCents);
}

interface RemoveConfirmDialogProps {
  supplyName: string;
  onConfirm(): void;
  onClose(): void;
}

function RemoveConfirmDialog({
  supplyName,
  onConfirm,
  onClose,
}: RemoveConfirmDialogProps) {
  return (
    <Dialog title="Tirar ficha de produção?" onClose={onClose}>
      <p className="hint mb-4">
        O custo de {supplyName} fica parado no último valor e passa a ser
        digitado como preço base.
      </p>
      <footer className="dialog-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="button button-danger"
          onClick={onConfirm}
        >
          Confirmar remoção
        </button>
      </footer>
    </Dialog>
  );
}

/**
 * Cartão de ficha de produção com rendimento, editor de ingredientes e custo derivado.
 *
 * @example <RecipeCard recipe={recipe} view={view} allRecipes={recipes} draft={draft} />
 */
export function RecipeCard({
  recipe,
  view,
  sheet,
  allRecipes,
  draft,
}: RecipeCardProps) {
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [yieldTyped, setYieldTyped] = useState(() =>
    formatQuantity(recipe.yieldQuantity),
  );
  const [yieldInvalid, setYieldInvalid] = useState(false);

  const producedSupply = view.snapshot.supplies.find(
    (s) => s.id === recipe.supplyId,
  );
  const recordedSupply = sheet?.snapshot.supplies.find(
    (s) => s.id === recipe.supplyId,
  );

  const supplyName = producedSupply?.name ?? `Insumo ${recipe.supplyId}`;
  const usageCount = countProductUsages(
    view.snapshot.products,
    recipe.supplyId,
  );
  const usageText = usageCount === 1 ? '1 lanche' : `${usageCount} lanches`;

  const totalReceita = useMemo(
    () => computeRecipeTotal(recipe.items, view.snapshot.supplies),
    [recipe.items, view.snapshot.supplies],
  );

  const currentUnitCost = producedSupply?.unitCost;
  const recordedUnitCost = recordedSupply?.unitCost;
  const costChanged = Boolean(
    recordedUnitCost && currentUnitCost && recordedUnitCost !== currentUnitCost,
  );
  const isIncomplete = view.incompleteSupplyIds.includes(recipe.supplyId);

  const excludedIds = useMemo(
    () => [recipe.supplyId, ...allRecipes.map((r) => r.supplyId)],
    [recipe.supplyId, allRecipes],
  );

  const handleYieldChange = (val: string) => {
    setYieldTyped(val);
    const valid = parseValidQuantity(val);
    if (!valid) {
      setYieldInvalid(true);
      return;
    }
    setYieldInvalid(false);
    draft.setRecipe({ ...recipe, yieldQuantity: valid });
  };

  const handleConfirmRemove = () => {
    draft.removeRecipe(recipe.supplyId);
    setConfirmRemoveOpen(false);
  };

  return (
    <section
      className="card p-4 flex flex-col gap-3"
      aria-label={`Ficha de ${supplyName}`}
    >
      <header className="flex justify-between items-baseline gap-2">
        <h2 className="font-display text-lg font-bold">{supplyName}</h2>
        <span className="text-muted text-xs">{usageText}</span>
      </header>

      <div className="flex items-center gap-2 text-sm text-muted">
        <label htmlFor={`yield-${recipe.supplyId}`}>Rende</label>
        <input
          id={`yield-${recipe.supplyId}`}
          className={`cell ${yieldInvalid ? 'border-danger bg-danger-soft' : ''}`}
          aria-label={`Rendimento de ${supplyName}`}
          aria-invalid={yieldInvalid}
          value={yieldTyped}
          onChange={(e) => handleYieldChange(e.target.value)}
        />
        <span>{producedSupply?.countUnit}</span>
      </div>

      <IngredientRows
        items={recipe.items}
        supplies={view.snapshot.supplies}
        excludedSupplyIds={excludedIds}
        onChange={(items) => draft.setRecipe({ ...recipe, items })}
        addLabel="+ Ingrediente"
      />

      <div className="flex justify-between items-baseline gap-2 pt-2 border-t border-line text-sm">
        <span className="text-muted text-xs">
          Ingredientes {formatMoney(totalReceita)} ÷ rende{' '}
          {formatQuantity(recipe.yieldQuantity)} {producedSupply?.countUnit} =
        </span>
        <div className="flex items-baseline gap-1">
          {costChanged && recordedUnitCost && (
            <span className="line-through text-muted text-xs">
              {formatTwoDecimals(recordedUnitCost)}
            </span>
          )}
          <span className="font-display text-xl font-bold">
            {currentUnitCost ? formatTwoDecimals(currentUnitCost) : '—'}
          </span>
          <span className="text-muted text-xs">
            por {producedSupply?.countUnit}
          </span>
          {isIncomplete && (
            <span className="tag tag-danger ml-2">incompleto</span>
          )}
        </div>
      </div>

      <footer className="flex justify-end pt-2">
        <button
          type="button"
          className="button button-secondary button-sm"
          onClick={() => setConfirmRemoveOpen(true)}
        >
          Tirar ficha
        </button>
      </footer>

      {confirmRemoveOpen && (
        <RemoveConfirmDialog
          supplyName={supplyName}
          onConfirm={handleConfirmRemove}
          onClose={() => setConfirmRemoveOpen(false)}
        />
      )}
    </section>
  );
}
