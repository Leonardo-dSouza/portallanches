import { useState } from 'react';
import { errorMessage } from '../api/error-message';
import { moneyToCents } from '../api/money';
import type { OutsideItemsResult } from '../api/purchase-types';
import type { OutsideMarks } from './outside-items';
import type { OutsideMarking } from './use-outside-toggle';
import { usePurchaseApi } from './use-purchase-api';

export interface OutsideSaveState {
  marking: OutsideMarking;
  /** Há marca mudada e ainda não salva. */
  dirty: boolean;
  saving: boolean;
  error: string | null;
  problem: string | null;
  /** A resposta da última gravação (o gasto da noite com o valor novo). */
  saved: OutsideItemsResult | null;
  save(): Promise<void>;
}

/**
 * Marcar em Compras os itens de fora de uma nota já lançada (2026-10-25): as marcas ficam na tela
 * até "Salvar marcação", que grava e recalcula o gasto da noite no servidor.
 *
 * @example const outside = useOutsideSave(12, () => { invoice.reload(); list.reload(); });
 */
export function useOutsideSave(
  invoiceId: number,
  onSaved: () => void,
  invoiceDiscount?: string,
  initialBusinessDiscount?: string,
): OutsideSaveState {
  const purchases = usePurchaseApi();
  const [positions, setPositions] = useState<number[] | null>(null);
  const [businessDiscount, setBusinessDiscount] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<OutsideItemsResult | null>(null);
  const change = (marks: OutsideMarks) => {
    setPositions(marks.positions);
    setBusinessDiscount(marks.businessDiscount);
    setDirty(true);
    setSaved(null);
  };
  const save = async () => {
    if (!dirty || positions === null || problem !== null) return;
    setSaving(true);
    try {
      const showDiscount =
        moneyToCents(invoiceDiscount ?? '0.00') > 0 && positions.length > 0;
      const discountToSend = showDiscount
        ? (businessDiscount ?? initialBusinessDiscount ?? invoiceDiscount)
        : undefined;
      setSaved(
        await purchases.markOutsideItems(invoiceId, positions, discountToSend),
      );
      setDirty(false);
      setError(null);
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };
  const marking: OutsideMarking = {
    positions,
    businessDiscount:
      businessDiscount ?? initialBusinessDiscount ?? invoiceDiscount ?? null,
    onChange: change,
    onProblemChange: setProblem,
  };
  return { marking, dirty, saving, error, problem, saved, save };
}
