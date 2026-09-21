import type { CellValue, SheetGrid } from './import-types.js';

/**
 * Letra da coluna como o Excel mostra (0 → A, 25 → Z, 26 → AA).
 *
 * @example columnLetter(1) // 'B'
 */
export function columnLetter(index: number): string {
  let rest = index;
  let letters = '';
  while (rest >= 0) {
    letters = String.fromCharCode(65 + (rest % 26)) + letters;
    rest = Math.floor(rest / 26) - 1;
  }
  return letters;
}

export function columnCount(grid: SheetGrid): number {
  return grid.reduce((widest, row) => Math.max(widest, row.length), 0);
}

export function cellAt(
  grid: SheetGrid,
  row: number,
  column: number,
): CellValue {
  return grid[row]?.[column] ?? null;
}

export function isBlank(cell: CellValue): boolean {
  return cell === null || (typeof cell === 'string' && cell.trim() === '');
}
