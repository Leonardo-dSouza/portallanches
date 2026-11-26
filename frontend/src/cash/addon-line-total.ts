import { centsToMoney } from '../api/money';
import { previewTotalCents, type DraftLine } from './order-lines';

/**
 * Total da linha com o pão e os adicionais dela, multiplicado pela quantidade: a mesma conta da
 * prévia do total da comanda (`previewTotalCents`), sem taxa.
 *
 * @example lineWithAddonsTotal(line) // '20.50'
 */
export function lineWithAddonsTotal(line: DraftLine): string {
  return centsToMoney(previewTotalCents([line], ''));
}
