import type {
  Product,
  ProductBundleItem,
  ProductBundleItemInput,
} from '../api/types';
import type { Parsed } from './catalog-values';

/** Linha do combo como digitada: id do produto (do select) e quantidade em texto. */
export interface BundleRowValues {
  productId: string;
  quantity: string;
}

export const EMPTY_BUNDLE_ROW: BundleRowValues = {
  productId: '',
  quantity: '1',
};

function parseBundleRow(
  row: BundleRowValues,
  index: number,
): Parsed<ProductBundleItemInput> {
  const typed = row.quantity.trim();
  const quantity = Number(typed);
  if (/^\d{1,2}$/.test(typed) && quantity >= 1)
    return { ok: true, value: { productId: Number(row.productId), quantity } };
  return {
    ok: false,
    error: `Quantidade do item ${index + 1} inválida "${row.quantity}": esperado inteiro de 1 a 99`,
  };
}

function assertDistinctItems(
  items: ProductBundleItemInput[],
): Parsed<ProductBundleItemInput[]> {
  const ids = items.map((item) => item.productId);
  if (new Set(ids).size === ids.length) return { ok: true, value: items };
  return {
    ok: false,
    error:
      'O mesmo item aparece em duas linhas do combo: some as quantidades numa só',
  };
}

/**
 * Itens do combo digitados no formato da API; linha sem produto é ignorada (abriu e não usou).
 *
 * @example parseBundleRows([{ productId: '11', quantity: '1' }]) // { ok: true, value: [{ productId: 11, quantity: 1 }] }
 */
export function parseBundleRows(
  rows: BundleRowValues[],
): Parsed<ProductBundleItemInput[]> {
  const filled = rows.filter((row) => row.productId !== '');
  if (filled.length === 0)
    return { ok: false, error: 'Combo precisa de pelo menos um item' };
  const items: ProductBundleItemInput[] = [];
  for (const [index, row] of filled.entries()) {
    const parsed = parseBundleRow(row, index);
    if (!parsed.ok) return parsed;
    items.push(parsed.value);
  }
  return assertDistinctItems(items);
}

/**
 * Itens do combo numa linha, para o quadro do Cardápio.
 *
 * @example bundleSummary(items) // '1× X Salada + 1× Guaraná lata'
 */
export function bundleSummary(items: ProductBundleItem[]): string {
  return items
    .map((item) => `${item.quantity}× ${item.productName}`)
    .join(' + ');
}

/**
 * Produtos que podem entrar num combo: ativos, que não são combos (um nível só) e que não são
 * o próprio combo em edição.
 *
 * @example bundleItemOptions(menu, editing?.id ?? null)
 */
export function bundleItemOptions(
  products: Product[],
  editingId: number | null,
): Product[] {
  return products.filter(
    (p) => p.active && p.bundleItems.length === 0 && p.id !== editingId,
  );
}
