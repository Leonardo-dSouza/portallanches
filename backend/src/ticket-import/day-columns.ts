import type {
  CellValue,
  Corrections,
  ImportIssue,
  SheetGrid,
} from './import-types.js';
import { cellAt, columnCount, columnLetter, isBlank } from './sheet-grid.js';

/** Coluna de um dia: cabeçalho resolvido e as células abaixo dele (linha 2 em diante). */
export interface DayColumn {
  where: string;
  date: string;
  cells: CellValue[];
}

const SKIP = 'skip';

function isoDateOf(value: Date): string | null {
  return Number.isNaN(value.getTime())
    ? null
    : value.toISOString().slice(0, 10);
}

function valueCells(grid: SheetGrid, column: number): CellValue[] {
  return Array.from({ length: Math.max(grid.length - 1, 0) }, (_, index) =>
    cellAt(grid, index + 1, column),
  );
}

function resolveHeader(
  header: CellValue,
  where: string,
  corrections: Corrections,
  issues: ImportIssue[],
): string | null {
  const corrected = corrections[where];
  if (corrected === SKIP) return null;
  if (typeof corrected === 'string') return corrected;
  if (header instanceof Date && isoDateOf(header)) return isoDateOf(header);
  issues.push({
    severity: 'error',
    where,
    message: `cabeçalho não é uma data: ${JSON.stringify(header)} (corrija com "${where}": "YYYY-MM-DD" ou "skip")`,
  });
  return null;
}

function checkMonth(
  date: string,
  month: number,
  year: number,
  where: string,
  issues: ImportIssue[],
): boolean {
  const expected = `${year}-${String(month).padStart(2, '0')}`;
  if (date.startsWith(expected)) return true;
  issues.push({
    severity: 'error',
    where,
    message: `data ${date} fora do mês esperado ${expected} (corrija com "${where}": "YYYY-MM-DD" ou "skip")`,
  });
  return false;
}

/**
 * Lê as colunas de dias de uma aba. Coluna sem nenhum valor é ignorada; coluna com
 * valores e cabeçalho inválido (ou fora do mês) vira erro e não entra no resultado.
 */
export function readDayColumns(
  sheetName: string,
  grid: SheetGrid,
  month: number,
  year: number,
  corrections: Corrections,
  issues: ImportIssue[],
): DayColumn[] {
  const columns: DayColumn[] = [];
  for (let index = 0; index < columnCount(grid); index++) {
    const cells = valueCells(grid, index);
    if (cells.every(isBlank)) continue;
    const where = `${sheetName}!${columnLetter(index)}`;
    const header = cellAt(grid, 0, index);
    const date = resolveHeader(header, where, corrections, issues);
    if (date === null || !checkMonth(date, month, year, where, issues))
      continue;
    columns.push({ where, date, cells });
  }
  return columns;
}
