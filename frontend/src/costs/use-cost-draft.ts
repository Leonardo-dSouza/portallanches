import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/api-client';
import type { CostApi } from '../api/cost-api';
import type {
  BasePriceChange,
  ComponentsChange,
  CostChanges,
  CostPreview,
  CostSheetView,
  ProductCostView,
  SupplyRecipe,
} from '../api/cost-types';
import { errorMessage } from '../api/error-message';
import {
  countChanges,
  createEmptyCostChanges,
  removeRecipeChange,
  setBasePriceChange,
  setComponentsChange,
  setRecipeChange,
} from './cost-draft';

/** Contrato do rascunho de custos manipulado pelas abas e pela barra de ação. */
export interface CostDraft {
  sheet: CostSheetView | null;
  changes: CostChanges;
  preview: CostPreview | null;
  changeCount: number;
  setBasePrice(change: BasePriceChange): void;
  setRecipe(recipe: SupplyRecipe): void;
  removeRecipe(supplyId: number): void;
  setComponents(change: ComponentsChange): void;
  /**
   * Lucro de um preço de teste com o rascunho atual, sem pôr o preço no rascunho: a tela de Custos
   * só calcula, o preço do cardápio muda em Cadastros (2026-11-18). null se o lanche não voltar.
   */
  simulateSalePrice(
    productId: number,
    salePrice: string,
  ): Promise<ProductCostView | null>;
  discard(): void;
  save(): Promise<void>;
  saving: boolean;
  conflict: boolean;
  error: string | null;
  reload(): Promise<void>;
}

/**
 * Hook do rascunho da planilha de custos: prévia com debounce de 300 ms, controle de concorrência e salvamento.
 *
 * @example const draft = useCostDraft(costApi);
 */
export function useCostDraft(costApi: CostApi): CostDraft {
  const [sheet, setSheet] = useState<CostSheetView | null>(null);
  const [changes, setChanges] = useState<CostChanges>(createEmptyCostChanges);
  const [preview, setPreview] = useState<CostPreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewSeq = useRef(0);

  useEffect(() => {
    let active = true;
    costApi
      .sheet()
      .then((data) => active && setSheet(data))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [costApi]);

  useEffect(() => {
    if (countChanges(changes) === 0) return;
    const timer = setTimeout(async () => {
      const seq = ++previewSeq.current;
      try {
        const result = await costApi.preview(changes);
        if (seq === previewSeq.current) setPreview(result);
      } catch (err) {
        if (seq === previewSeq.current) setError(errorMessage(err));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [changes, costApi]);

  const discard = useCallback(() => {
    // Invalida a prévia em voo: a resposta que chegar depois do Descartar é de um rascunho que não existe mais.
    previewSeq.current += 1;
    setChanges(createEmptyCostChanges());
    setPreview(null);
    setConflict(false);
    setError(null);
  }, []);

  const reload = useCallback(async () => {
    discard();
    try {
      const data = await costApi.sheet();
      setSheet(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [costApi, discard]);

  const save = useCallback(async () => {
    if (!sheet || countChanges(changes) === 0) return;
    setSaving(true);
    setError(null);
    try {
      await costApi.apply(changes, sheet.snapshot.lastChangeSetId);
      discard();
      const nextSheet = await costApi.sheet();
      setSheet(nextSheet);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflict(true);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }, [sheet, changes, costApi, discard]);

  const simulateSalePrice = useCallback(
    async (productId: number, salePrice: string) => {
      const salePrices = [{ productId, salePrice }];
      const result = await costApi.preview({ ...changes, salePrices });
      return result.products.find((p) => p.id === productId) ?? null;
    },
    [changes, costApi],
  );

  return {
    sheet,
    changes,
    preview,
    changeCount: countChanges(changes),
    setBasePrice: (c) => setChanges((prev) => setBasePriceChange(prev, c)),
    setRecipe: (r) => setChanges((prev) => setRecipeChange(prev, r)),
    removeRecipe: (id) => setChanges((prev) => removeRecipeChange(prev, id)),
    setComponents: (c) => setChanges((prev) => setComponentsChange(prev, c)),
    simulateSalePrice,
    discard,
    save,
    saving,
    conflict,
    error,
    reload,
  };
}
