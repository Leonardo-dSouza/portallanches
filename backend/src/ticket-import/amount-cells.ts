import { formatCents } from '../common/money.js';
import type { CellValue, Corrections, ImportIssue } from './import-types.js';
import { isBlank } from './sheet-grid.js';

const CENTS_TOLERANCE = 1e-6;

/** Célula que a planilha usa para "sem valor"; vira aviso, não erro. */
const PLACEHOLDER = '-';

/**
 * Converte as células de valores de uma coluna, mantendo a posição de cada uma
 * (a aba de gastos usa a 2ª linha como motoboy). Vazia, `-` ou zero viram null
 * (com aviso, exceto vazia); texto, negativo ou mais de 2 casas geram erro, a não
 * ser que `corrections` traga o valor certo (ou `skip`) para aquela célula.
 *
 * @example readAmountCells([36.4, null, '-'], 'Janeiro!B', {}, []) // ['36.40', null, null]
 */
export function readAmountCells(
  cells: CellValue[],
  where: string,
  corrections: Corrections,
  issues: ImportIssue[],
): (string | null)[] {
  return cells.map((cell, index) => {
    const cellWhere = `${where}${index + 2}`;
    const fixed = corrections[cellWhere];
    if (fixed === 'skip') return null;
    return readAmountCell(fixed ?? cell, cellWhere, issues);
  });
}

function readAmountCell(
  cell: CellValue | number,
  where: string,
  issues: ImportIssue[],
): string | null {
  if (isBlank(cell)) return null;
  if (typeof cell === 'string' && cell.trim() === PLACEHOLDER) {
    issues.push({ severity: 'warning', where, message: 'célula "-" ignorada' });
    return null;
  }
  if (cell === 0) {
    issues.push({ severity: 'warning', where, message: 'valor 0 ignorado' });
    return null;
  }
  const cents = toValidCents(cell);
  if (cents !== null) return formatCents(cents);
  issues.push({
    severity: 'error',
    where,
    message: `valor inválido ${JSON.stringify(cell)}: esperado número maior que zero com até 2 casas decimais (corrija com "${where}": valor ou "skip")`,
  });
  return null;
}

function toValidCents(cell: CellValue): number | null {
  if (typeof cell !== 'number' || !Number.isFinite(cell) || cell <= 0) {
    return null;
  }
  const cents = Math.round(cell * 100);
  return Math.abs(cell * 100 - cents) < CENTS_TOLERANCE ? cents : null;
}
