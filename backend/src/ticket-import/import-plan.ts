import { readAmountCells } from './amount-cells.js';
import { readDayColumns, type DayColumn } from './day-columns.js';
import type {
  Corrections,
  ImportIssue,
  ImportPlan,
  PlannedDay,
  SheetGrid,
} from './import-types.js';

export const MONTH_SHEETS: readonly string[] = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const expensesSheetOf = (month: string): string => `Gastos-${month}`;

/** Indexa colunas por data; data repetida na mesma aba é erro e mantém a primeira. */
function indexByDate(
  columns: DayColumn[],
  issues: ImportIssue[],
): Map<string, DayColumn> {
  const byDate = new Map<string, DayColumn>();
  for (const column of columns) {
    const first = byDate.get(column.date);
    if (!first) {
      byDate.set(column.date, column);
      continue;
    }
    issues.push({
      severity: 'error',
      where: column.where,
      message: `data ${column.date} repetida (já usada em ${first.where})`,
    });
  }
  return byDate;
}

function buildDay(
  date: string,
  orders: DayColumn | undefined,
  expenses: DayColumn | undefined,
  corrections: Corrections,
  issues: ImportIssue[],
): PlannedDay {
  const read = (column: DayColumn | undefined) =>
    column
      ? readAmountCells(column.cells, column.where, corrections, issues)
      : [];
  const [motoboy = null, ...others] = read(expenses);
  return {
    date,
    orderAmounts: read(orders).filter((value) => value !== null),
    motoboy,
    otherExpenses: others.filter((value) => value !== null),
  };
}

function reportUnmatched(
  orders: Map<string, DayColumn>,
  expenses: Map<string, DayColumn>,
  issues: ImportIssue[],
): void {
  for (const [date, column] of orders) {
    if (expenses.has(date)) continue;
    issues.push({
      severity: 'warning',
      where: column.where,
      message: `pedidos de ${date} sem coluna correspondente na aba de gastos: o dia entra sem gastos`,
    });
  }
  for (const [date, column] of expenses) {
    if (orders.has(date)) continue;
    issues.push({
      severity: 'warning',
      where: column.where,
      message: `gastos de ${date} sem pedidos no dia: o dia entra só com gastos (confira se a data está certa)`,
    });
  }
}

function planMonth(
  month: string,
  monthNumber: number,
  year: number,
  grids: Map<string, SheetGrid>,
  corrections: Corrections,
  issues: ImportIssue[],
): PlannedDay[] {
  const ordersGrid = grids.get(month);
  const expensesGrid = grids.get(expensesSheetOf(month));
  if (!ordersGrid) return [];
  const read = (name: string, grid: SheetGrid | undefined) =>
    grid
      ? readDayColumns(name, grid, monthNumber, year, corrections, issues)
      : [];
  const orders = indexByDate(read(month, ordersGrid), issues);
  const expenses = indexByDate(
    read(expensesSheetOf(month), expensesGrid),
    issues,
  );
  reportUnmatched(orders, expenses, issues);
  const dates = new Set([...orders.keys(), ...expenses.keys()]);
  return [...dates].map((date) =>
    buildDay(date, orders.get(date), expenses.get(date), corrections, issues),
  );
}

function reportDuplicatedDates(
  days: PlannedDay[],
  issues: ImportIssue[],
): void {
  const seen = new Set<string>();
  for (const { date } of days) {
    if (seen.has(date)) {
      issues.push({
        severity: 'error',
        where: date,
        message: `data ${date} aparece em mais de uma aba de mês`,
      });
    }
    seen.add(date);
  }
}

/**
 * Transforma as abas da planilha em dias a importar, coletando TODOS os problemas
 * (nada é corrigido em silêncio). Pedidos e gastos do mesmo dia são casados pela data
 * do cabeçalho, não pela posição da coluna: as abas de gastos às vezes ficam
 * deslocadas em relação às de pedidos.
 *
 * @example buildImportPlan(grids, 2026, {}) // { days: [{ date: '2026-01-11', ... }], issues: [] }
 */
export function buildImportPlan(
  grids: Map<string, SheetGrid>,
  year: number,
  corrections: Corrections,
): ImportPlan {
  const issues: ImportIssue[] = [];
  const days = MONTH_SHEETS.flatMap((month, index) =>
    planMonth(month, index + 1, year, grids, corrections, issues),
  ).sort((a, b) => a.date.localeCompare(b.date));
  reportDuplicatedDates(days, issues);
  return { days, issues };
}
