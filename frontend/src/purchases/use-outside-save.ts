import { useState } from 'react';
import { errorMessage } from '../api/error-message';
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
): OutsideSaveState {
  const purchases = usePurchaseApi();
  const [positions, setPositions] = useState<number[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<OutsideItemsResult | null>(null);
  const change = (marks: OutsideMarks) => {
    setPositions(marks.positions);
    setDirty(true);
    setSaved(null);
  };
  const save = async () => {
    if (!dirty || positions === null) return;
    setSaving(true);
    try {
      setSaved(await purchases.markOutsideItems(invoiceId, positions));
      setDirty(false);
      setError(null);
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };
  const marking = { positions, onChange: change };
  return { marking, dirty, saving, error, saved, save };
}
