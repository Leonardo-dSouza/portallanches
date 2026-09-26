import { toApiQuantity } from '../api/quantity';
import type { StockCountItem, StockCountStatus } from '../api/types';
import type { Parsed } from '../catalog/catalog-values';

/** Linha da contagem: em branco não entra; número = contado; ou uma das marcas. */
export interface CountRowValues {
  status: StockCountStatus | null;
  quantity: string;
}

export const BLANK_COUNT_ROW: CountRowValues = { status: null, quantity: '' };

/** Digitar um número marca a linha como contada; apagar tudo volta a "em branco". */
export function withTypedQuantity(quantity: string): CountRowValues {
  return { status: quantity.trim() ? 'COUNTED' : null, quantity };
}

/** Clicar numa marca já escolhida desmarca (volta a "em branco"). */
export function withMark(
  row: CountRowValues,
  mark: Exclude<StockCountStatus, 'COUNTED'>,
): CountRowValues {
  return row.status === mark ? BLANK_COUNT_ROW : { status: mark, quantity: '' };
}

function toItem(
  supplyId: number,
  row: CountRowValues,
  name: string,
): Parsed<StockCountItem> {
  if (row.status !== 'COUNTED')
    return {
      ok: true,
      value: { supplyId, status: row.status ?? 'NOT_COUNTED' },
    };
  const quantity = toApiQuantity(row.quantity);
  if (quantity !== null)
    return { ok: true, value: { supplyId, status: 'COUNTED', quantity } };
  return {
    ok: false,
    error: `Contagem de "${name}" inválida "${row.quantity}": digite só números, até 3 casas (ex.: 8 ou 2,5)`,
  };
}

/**
 * Monta a sessão de contagem só com as linhas preenchidas.
 *
 * @example buildCountItems(new Map([[3, { status: 'COUNTED', quantity: '8' }]]), (id) => 'Refri')
 */
export function buildCountItems(
  rows: ReadonlyMap<number, CountRowValues>,
  nameOf: (supplyId: number) => string,
): Parsed<StockCountItem[]> {
  const filled = [...rows].filter(([, row]) => row.status !== null);
  if (filled.length === 0)
    return {
      ok: false,
      error: 'Preencha pelo menos um insumo antes de salvar a contagem',
    };
  const items: StockCountItem[] = [];
  for (const [supplyId, row] of filled) {
    const item = toItem(supplyId, row, nameOf(supplyId));
    if (!item.ok) return item;
    items.push(item.value);
  }
  return { ok: true, value: items };
}
