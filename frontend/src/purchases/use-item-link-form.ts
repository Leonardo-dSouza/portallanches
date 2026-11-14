import { useState } from 'react';
import { errorMessage } from '../api/error-message';
import type { ItemSupplyLink } from '../api/purchase-types';
import type { Supply } from '../api/types';
import type { BasePriceChoice } from '../costs/base-price-values';
import { initialChoice } from './item-link-values';
import { usePurchaseApi } from './use-purchase-api';

interface ItemLinkFormInput {
  vendorId: number;
  code: string;
  link: ItemSupplyLink | null | undefined;
  supplies: Supply[];
  onSaved(): void;
  onClose(): void;
}

/**
 * Grava ou desliga e fecha; na falha, mostra o motivo e deixa tentar de novo (2026-11-14:
 * antes, uma falha deixava o diálogo travado em "gravando" sem dizer nada).
 */
function useLinkRequest(onDone: () => void) {
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setProblem(null);
    try {
      await action();
      onDone();
    } catch (failure) {
      setProblem(errorMessage(failure));
      setSaving(false);
    }
  };
  return { saving, problem, run };
}

/** Insumo escolhido e a embalagem, que volta à do insumo ao trocar de insumo. */
function useSupplyChoice(input: ItemLinkFormInput) {
  const { link, supplies } = input;
  const [supplyId, setSupplyId] = useState(link?.supplyId ?? null);
  const supply = supplies.find((s) => s.id === supplyId) ?? null;
  const [choice, setChoice] = useState<BasePriceChoice | null>(() =>
    supply ? initialChoice(link, supply) : null,
  );
  const selectSupply = (id: number) => {
    const next = supplies.find((s) => s.id === id);
    setSupplyId(id);
    setChoice(next ? initialChoice(link, next) : null);
  };
  return { supply, choice, setChoice, selectSupply };
}

/**
 * Estado do "Ligar a insumo": insumo, embalagem, gravar e desligar.
 *
 * @example const form = useItemLinkForm({ vendorId: 1, code: 'HB-01', link: null, supplies, onSaved, onClose });
 */
export function useItemLinkForm(input: ItemLinkFormInput) {
  const { vendorId, code } = input;
  const purchases = usePurchaseApi();
  const picked = useSupplyChoice(input);
  const request = useLinkRequest(() => {
    input.onSaved();
    input.onClose();
  });
  const { supply, choice } = picked;
  const save = () =>
    supply && choice
      ? request.run(() =>
          purchases.saveItemLink({
            vendorId,
            code,
            supplyId: supply.id,
            baseQuantity: choice.quantity,
            label: choice.label,
          }),
        )
      : Promise.resolve();
  const unlink = () =>
    request.run(() => purchases.deleteItemLink(vendorId, code));
  return { ...picked, ...request, save, unlink };
}
