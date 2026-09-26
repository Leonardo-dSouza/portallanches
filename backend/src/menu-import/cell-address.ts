import type { FormulaCell, FormulaGrid } from './menu-types.js';

const ADDRESS = /^\$?([A-Z]{1,3})\$?(\d{1,7})$/;
const ROW_RANGE = /^(\d{1,7})-(\d{1,7})$/;
const EMPTY_CELL: FormulaCell = { value: null, formula: null };

/**
 * Índice da coluna a partir da letra (A → 0, AA → 26); inverso de `columnLetter`.
 *
 * @example columnIndex('AO') // 40
 */
export function columnIndex(letters: string): number {
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

/**
 * Endereço do Excel (`F4`, `$H$44`) em linha e coluna a partir de 0; null se inválido.
 *
 * @example parseCellAddress('F4') // { row: 3, column: 5 }
 */
export function parseCellAddress(
  address: string,
): { row: number; column: number } | null {
  const match = ADDRESS.exec(address.trim().toUpperCase());
  if (!match) return null;
  return { row: Number(match[2]) - 1, column: columnIndex(match[1]) };
}

/**
 * Faixa de linhas do Excel (`'2-26'`) como lista de números do Excel; null se inválida.
 *
 * @example parseRowRange('2-4') // [2, 3, 4]
 */
export function parseRowRange(range: string): number[] | null {
  const match = ROW_RANGE.exec(range.trim());
  if (!match) return null;
  const [first, last] = [Number(match[1]), Number(match[2])];
  if (first < 1 || last < first) return null;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

export function formulaCellAt(
  grid: FormulaGrid,
  row: number,
  column: number,
): FormulaCell {
  return grid[row]?.[column] ?? EMPTY_CELL;
}
