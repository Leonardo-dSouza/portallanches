import { useEffect, useState } from 'react';
import { errorMessage } from '../api/error-message';
import type { ItemSupplyLink, LinkProduct } from '../api/purchase-types';
import type { Supply } from '../api/types';
import type { BasePriceChoice } from '../costs/base-price-values';
import { initialChoice, suggestedProductName } from './item-link-values';
import { usePurchaseApi } from './use-purchase-api';

interface ItemLinkFormInput {
  vendorId: number;
  code: string;
  /** Descrição do item na nota: base da sugestão do produto com a marca. */
  description: string;
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
  return { saving, problem, run, fail: setProblem };
}

const MIN_PRODUCT_NAME = 2;
export const MISSING_PRODUCT_NAME =
  'Escreva o produto com a marca (ex.: Bacon Seara kg)';

/** Produtos com a marca já usados (sugestão); falha na leitura = sem sugestão. */
function useKnownProducts(): LinkProduct[] {
  const purchases = usePurchaseApi();
  const [known, setKnown] = useState<LinkProduct[]>([]);
  useEffect(() => {
    let active = true;
    purchases.linkProducts().then(
      (list) => active && setKnown(list),
      () => active && setKnown([]),
    );
    return () => {
      active = false;
    };
  }, [purchases]);
  return known;
}

/**
 * Produto com a marca: o digitado; antes de digitar, o da ligação gravada (mesmo insumo) ou a
 * sugestão pela descrição da nota e pelos produtos que o insumo já tem.
 */
function useProductName(input: ItemLinkFormInput, supplyId: number | null) {
  const known = useKnownProducts();
  const [typed, setTyped] = useState<string | null>(null);
  const saved =
    input.link?.supplyId === supplyId ? input.link?.productName : null;
  const suggestion =
    supplyId === null
      ? ''
      : suggestedProductName(input.description, supplyId, known);
  const productName = typed ?? saved ?? suggestion;
  const options = known.filter((p) => p.supplyId === supplyId);
  return { productName, setProductName: setTyped, productOptions: options };
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
  const product = useProductName(input, picked.supply?.id ?? null);
  const request = useLinkRequest(() => {
    input.onSaved();
    input.onClose();
  });
  const { supply, choice } = picked;
  const save = () => {
    const productName = product.productName.trim();
    if (!supply || !choice) return Promise.resolve();
    if (productName.length < MIN_PRODUCT_NAME) {
      request.fail(MISSING_PRODUCT_NAME);
      return Promise.resolve();
    }
    return request.run(() =>
      purchases.saveItemLink({
        vendorId,
        code,
        supplyId: supply.id,
        baseQuantity: choice.quantity,
        label: choice.label,
        productName,
      }),
    );
  };
  const unlink = () =>
    request.run(() => purchases.deleteItemLink(vendorId, code));
  return { ...picked, ...product, ...request, save, unlink };
}
