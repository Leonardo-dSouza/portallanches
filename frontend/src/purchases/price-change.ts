import { toNeighborhoodKey } from '../cash/neighborhood-key';

/** Variação do último preço sobre o da compra anterior. */
export interface PriceChange {
  direction: 'up' | 'down' | 'same';
  /** '+5,4%', '−9,5%' ou '0%'. */
  label: string;
}

/** Preço da API ('19.9') em décimos de milésimo inteiros, para comparar sem float. */
function priceUnits(price: string): bigint {
  const [integerPart, decimals = ''] = price.split('.');
  return (
    BigInt(integerPart) * 10_000n + BigInt(decimals.padEnd(4, '0').slice(0, 4))
  );
}

/**
 * Quanto o preço subiu ou desceu desde a compra anterior; null sem compra anterior.
 *
 * @example priceChange('21.5', '20.4') // { direction: 'up', label: '+5,4%' }
 */
export function priceChange(
  last: string,
  previous: string | null,
): PriceChange | null {
  if (previous === null) return null;
  const before = priceUnits(previous);
  const diff = priceUnits(last) - before;
  if (diff === 0n || before === 0n) return { direction: 'same', label: '0%' };
  const tenths = Math.round((Number(diff) * 1000) / Number(before));
  const percent = (Math.abs(tenths) / 10).toFixed(1).replace('.', ',');
  return diff > 0n
    ? { direction: 'up', label: `+${percent}%` }
    : { direction: 'down', label: `−${percent}%` };
}

/**
 * Busca das listas de Compras: sem acento, sem diferença de maiúsculas, em qualquer campo.
 *
 * @example matchesSearch('açai', 'ACAI POLPA 1KG') // true
 */
export function matchesSearch(query: string, ...fields: string[]): boolean {
  const key = toNeighborhoodKey(query);
  return !key || fields.some((field) => toNeighborhoodKey(field).includes(key));
}
