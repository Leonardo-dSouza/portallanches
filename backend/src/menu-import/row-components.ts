import { fromMilli, multiplyQuantities, toMilli } from '../common/quantity.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import type { ImportIssue } from '../ticket-import/import-types.js';
import { columnLetter, isBlank } from '../ticket-import/sheet-grid.js';
import { formulaCellAt } from './cell-address.js';
import { parseComponentFormula, type FormulaTerm } from './formula-terms.js';
import { COSTS_SHEET, numericCell } from './supply-costs.js';
import type {
  FormulaCell,
  FormulaGrid,
  MenuCorrections,
  PlannedComponent,
  PortionPart,
} from './menu-types.js';

// Nas abas de custo os rótulos ficam em C, E, G... e os valores em D, F, H... até AF.
const FIRST_VALUE_COLUMN = 3;
const LAST_VALUE_COLUMN = 31;
const SKIP = 'skip';
const FIX_HINT = `corrija com "=${COSTS_SHEET}!<célula>" ou "skip"`;

export interface RowSource {
  sheet: string;
  grid: FormulaGrid;
  /** Linha a partir de 0. */
  row: number;
  corrections: MenuCorrections;
  portions: Record<string, PortionPart[]>;
}

export interface RowComponents {
  components: PlannedComponent[];
  issues: ImportIssue[];
  /** Alguma célula da linha foi trocada pelas correções (o CMV pode não bater com a planilha). */
  corrected: boolean;
}

/** Quantidade por insumo em milésimos, acumulada ao longo da linha. */
type Totals = Map<string, number>;

/**
 * Célula como o importador deve ler: aplica a correção de `Aba!Célula`, se houver.
 *
 * @example effectiveCell(cell, 'Lanches!F18', { 'Lanches!F18': '=itens_custos!F15' })
 */
export function effectiveCell(
  cell: FormulaCell,
  address: string,
  corrections: MenuCorrections,
): FormulaCell {
  const correction = corrections[address];
  if (correction === undefined) return cell;
  if (correction === SKIP) return { value: null, formula: null };
  if (correction.startsWith('='))
    return { value: null, formula: correction.slice(1) };
  return { value: correction, formula: null };
}

const errorAt = (where: string, message: string): ImportIssue => ({
  severity: 'error',
  where,
  message,
});

function literalIssue(cell: FormulaCell, where: string): ImportIssue {
  const shown = JSON.stringify(cell.value);
  if (numericCell(cell.value) !== null)
    return errorAt(
      where,
      `valor digitado ${shown} sem fórmula: não dá para saber o insumo; ${FIX_HINT}`,
    );
  return errorAt(
    where,
    `texto ${shown} numa coluna de valor: esperado fórmula com ${COSTS_SHEET}; ${FIX_HINT}`,
  );
}

function addPart(
  part: PortionPart,
  factor: string,
  totals: Totals,
): string | null {
  const quantity = multiplyQuantities(part.quantity, factor);
  if (quantity === null)
    return `${part.quantity} × ${factor} de "${part.supply}" passa de 3 casas decimais`;
  const key = toNeighborhoodKey(part.supply);
  totals.set(key, (totals.get(key) ?? 0) + toMilli(quantity));
  return null;
}

function addTerm(
  term: FormulaTerm,
  portions: Record<string, PortionPart[]>,
  totals: Totals,
): string[] {
  const parts = portions[term.cell];
  if (!parts)
    return [`${COSTS_SHEET}!${term.cell} não está em "portions" do mapeamento`];
  return parts
    .map((part) => addPart(part, term.factor, totals))
    .filter((problem): problem is string => problem !== null);
}

/** Soma a fórmula de uma célula em `totals`; devolve os problemas encontrados. */
function addFormula(
  formula: string,
  where: string,
  portions: Record<string, PortionPart[]>,
  totals: Totals,
): ImportIssue[] {
  const terms = parseComponentFormula(formula);
  if (!terms)
    return [
      errorAt(
        where,
        `fórmula fora do padrão "=${formula}": esperado soma de ${COSTS_SHEET}!<célula>, com multiplicador opcional`,
      ),
    ];
  return terms
    .flatMap((term) => addTerm(term, portions, totals))
    .map((message) => errorAt(where, message));
}

function readValueCell(
  source: RowSource,
  column: number,
  totals: Totals,
): ImportIssue[] {
  const address = `${source.sheet}!${columnLetter(column)}${source.row + 1}`;
  const raw = formulaCellAt(source.grid, source.row, column);
  const cell = effectiveCell(raw, address, source.corrections);
  if (cell.formula)
    return addFormula(cell.formula, address, source.portions, totals);
  return isBlank(cell.value) ? [] : [literalIssue(cell, address)];
}

function valueColumns(): number[] {
  const columns: number[] = [];
  for (let c = FIRST_VALUE_COLUMN; c <= LAST_VALUE_COLUMN; c += 2)
    columns.push(c);
  return columns;
}

function rowWasCorrected(source: RowSource): boolean {
  const suffix = `${source.row + 1}`;
  return Object.keys(source.corrections).some((address) => {
    const [sheet, cell] = address.split('!');
    return sheet === source.sheet && cell?.replace(/^[A-Z]+/, '') === suffix;
  });
}

/**
 * Composição de uma linha de lanche: cada célula de valor (D, F, ... AF) com fórmula vira
 * insumos pelo `portions`; insumo repetido tem as quantidades somadas.
 *
 * @example planRowComponents({ sheet: 'Lanches', grid, row: 9, corrections: {}, portions })
 */
export function planRowComponents(source: RowSource): RowComponents {
  const totals: Totals = new Map();
  const issues = valueColumns().flatMap((column) =>
    readValueCell(source, column, totals),
  );
  const components = [...totals].map(([supplyKey, milli]) => ({
    supplyKey,
    quantity: fromMilli(milli),
  }));
  return { components, issues, corrected: rowWasCorrected(source) };
}
