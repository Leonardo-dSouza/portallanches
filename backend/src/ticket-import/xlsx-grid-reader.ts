import ExcelJS from 'exceljs';
import type { CellValue, SheetGrid } from './import-types.js';

/** Leitor de planilhas atrás de interface própria: trocar a biblioteca não toca o resto. */
export interface WorkbookReader {
  readSheets(path: string): Promise<Map<string, SheetGrid>>;
}

function normalizeCell(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return String(value);
  if ('result' in value)
    return normalizeCell(value.result as ExcelJS.CellValue);
  if ('richText' in value) return value.richText.map((r) => r.text).join('');
  if ('error' in value) return String(value.error);
  return JSON.stringify(value);
}

function toGrid(sheet: ExcelJS.Worksheet): SheetGrid {
  const grid: SheetGrid = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells: CellValue[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cells[columnNumber - 1] = normalizeCell(cell.value);
    });
    grid[rowNumber - 1] = cells;
  });
  return grid;
}

export class ExcelJsWorkbookReader implements WorkbookReader {
  async readSheets(path: string): Promise<Map<string, SheetGrid>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path);
    const grids = new Map<string, SheetGrid>();
    workbook.eachSheet((sheet) => grids.set(sheet.name, toGrid(sheet)));
    return grids;
  }
}
