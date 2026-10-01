import ExcelJS from 'exceljs';
import { normalizeCell } from '../ticket-import/xlsx-grid-reader.js';
import type { FormulaCell, FormulaGrid } from './menu-types.js';

/** Leitor que entrega valor e fórmula de cada célula; a biblioteca fica atrás desta interface. */
export interface FormulaWorkbookReader {
  readSheets(path: string): Promise<Map<string, FormulaGrid>>;
  /** Mesmo resultado de `readSheets`, para arquivo recebido por upload (sem tocar no disco). */
  readSheetsFromBuffer(file: Buffer): Promise<Map<string, FormulaGrid>>;
}

function toFormulaCell(cell: ExcelJS.Cell): FormulaCell {
  // `cell.formula` já traduz fórmulas compartilhadas (F5 herdando "E4" de F4 vira "E5").
  return { value: normalizeCell(cell.value), formula: cell.formula || null };
}

function toGrid(sheet: ExcelJS.Worksheet): FormulaGrid {
  const grid: FormulaGrid = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells: FormulaCell[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cells[columnNumber - 1] = toFormulaCell(cell);
    });
    grid[rowNumber - 1] = cells;
  });
  return grid;
}

function gridsOf(workbook: ExcelJS.Workbook): Map<string, FormulaGrid> {
  const grids = new Map<string, FormulaGrid>();
  workbook.eachSheet((sheet) => grids.set(sheet.name, toGrid(sheet)));
  return grids;
}

/** Abre `.xlsx` e `.xlsm` (as macros são ignoradas). */
export class ExcelJsFormulaWorkbookReader implements FormulaWorkbookReader {
  async readSheets(path: string): Promise<Map<string, FormulaGrid>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path);
    return gridsOf(workbook);
  }

  async readSheetsFromBuffer(file: Buffer): Promise<Map<string, FormulaGrid>> {
    const workbook = new ExcelJS.Workbook();
    // O tipo do exceljs pede o Buffer antigo do Node; o conteúdo é o mesmo.
    await workbook.xlsx.load(file as unknown as ExcelJS.Buffer);
    return gridsOf(workbook);
  }
}
