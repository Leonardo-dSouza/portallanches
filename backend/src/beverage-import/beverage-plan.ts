import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import {
  columnIndex,
  formulaCellAt,
  parseRowRange,
} from '../menu-import/cell-address.js';
import { computeCmv } from '../products/cmv.js';
import { duplicateProductIssues } from '../menu-import/menu-plan.js';
import type {
  FormulaGrid,
  MenuCorrections,
  MenuPlan,
  PlannedProduct,
  PlannedSupply,
} from '../menu-import/menu-types.js';
import { effectiveCell } from '../menu-import/row-components.js';
import { numericCell, toUnitCost } from '../menu-import/supply-costs.js';
import type { CellValue, ImportIssue } from '../ticket-import/import-types.js';
import {
  BEVERAGE_COLUMNS as COL,
  type BeverageBlock,
  type BeverageLayout,
} from './beverage-layout.js';

// "Custo un" digitado à mão que difere de custo ÷ qtd por mais que isso merece aviso.
const UNIT_COST_TOLERANCE = 0.01;

/** Uma linha da planilha de bebidas sendo lida. */
interface BeverageRow {
  sheet: string;
  grid: FormulaGrid;
  /** Linha do Excel (a partir de 1). */
  excelRow: number;
  corrections: MenuCorrections;
  splits: BeverageLayout['splits'];
}

interface PlannedBeverage {
  supply: PlannedSupply;
  product: PlannedProduct;
  issues: ImportIssue[];
}

const addressOf = (r: BeverageRow, column: string) =>
  `${r.sheet}!${column}${r.excelRow}`;

const rawCellValue = (r: BeverageRow, column: string) =>
  formulaCellAt(r.grid, r.excelRow - 1, columnIndex(column)).value;

function cellValue(r: BeverageRow, column: string) {
  const cell = formulaCellAt(r.grid, r.excelRow - 1, columnIndex(column));
  return effectiveCell(cell, addressOf(r, column), r.corrections).value;
}

const hasText = (value: CellValue): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Número positivo da célula; zero, vazio e erro do Excel (`#DIV/0!`) contam como ausentes. */
function positiveAt(r: BeverageRow, column: string): number | null {
  const value = numericCell(cellValue(r, column));
  return value !== null && value > 0 ? value : null;
}

/**
 * A planilha vem em minúsculas ("coca cola lt 350ml"); o cardápio mostra cada palavra
 * com inicial maiúscula.
 *
 * @example toDisplayName('  coca  cola lt 350ml ') // 'Coca Cola Lt 350ml'
 */
export function toDisplayName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const warningAt = (where: string, message: string): ImportIssue => ({
  severity: 'warning',
  where,
  message,
});

function costMismatch(r: BeverageRow, unitCost: number, name: string) {
  const [packageCost, quantity] = [
    positiveAt(r, COL.packageCost),
    positiveAt(r, COL.packageQuantity),
  ];
  if (packageCost === null || quantity === null) return [];
  const computed = packageCost / quantity;
  if (Math.abs(computed - unitCost) <= UNIT_COST_TOLERANCE) return [];
  return [
    warningAt(
      addressOf(r, COL.unitCost),
      `"custo un" de "${name}" é ${unitCost}, mas custo ÷ qtd dá ${computed.toFixed(2)}; vale o "custo un" digitado`,
    ),
  ];
}

function unitCostOf(r: BeverageRow, name: string) {
  const unitCost = positiveAt(r, COL.unitCost);
  if (unitCost === null)
    return {
      unitCost: null,
      issues: [
        warningAt(
          addressOf(r, COL.unitCost),
          `"${name}" sem custo: entra sem custo e sem CMV`,
        ),
      ],
    };
  return {
    unitCost: toUnitCost(unitCost, '1'),
    issues: costMismatch(r, unitCost, name),
  };
}

function salePriceOf(r: BeverageRow, name: string) {
  const price = positiveAt(r, COL.salePrice);
  if (price !== null) return { salePrice: price.toFixed(2), issues: [] };
  const issue = warningAt(
    addressOf(r, COL.salePrice),
    `"${name}" sem preço de venda: entra sem preço`,
  );
  return { salePrice: null, issues: [issue] };
}

function packagesOf(r: BeverageRow, block: BeverageBlock, name: string) {
  const quantity = positiveAt(r, COL.packageQuantity);
  if (quantity !== null)
    return {
      packages: [{ name: block.packageName, quantity: String(quantity) }],
      issues: [],
    };
  const issue = warningAt(
    addressOf(r, COL.packageQuantity),
    `"${name}" sem qtd da embalagem: entra sem ${block.packageName}`,
  );
  return { packages: [], issues: [issue] };
}

function toSupply(name: string, unitCost: string | null): PlannedSupply {
  return {
    name,
    nameKey: toNeighborhoodKey(name),
    countUnit: 'un',
    unitCost,
    deductOnSale: true,
    packages: [],
  };
}

function toProduct(
  r: BeverageRow,
  block: BeverageBlock,
  supply: PlannedSupply,
  salePrice: string | null,
): PlannedProduct {
  return {
    where: `${r.sheet}!${r.excelRow}`,
    category: block.category,
    categoryKey: toNeighborhoodKey(block.category),
    name: supply.name,
    nameKey: supply.nameKey,
    menuNumber: null,
    description: null,
    salePrice,
    components: [{ supplyKey: supply.nameKey, quantity: '1' }],
    // Uma unidade do próprio insumo; mesmo arredondamento dos lanches (10,395 → 10,40).
    cmv:
      supply.unitCost === null
        ? null
        : computeCmv([{ quantity: '1', unitCost: supply.unitCost }]).cmv,
  };
}

/** Custo, preço e embalagem lidos uma vez por linha, valendo para cada produto dela. */
interface RowValues {
  unitCost: string | null;
  salePrice: string | null;
  packages: PlannedSupply['packages'];
  issues: ImportIssue[];
}

function readRowValues(
  r: BeverageRow,
  block: BeverageBlock,
  name: string,
): RowValues {
  const cost = unitCostOf(r, name);
  const price = salePriceOf(r, name);
  const packaging = packagesOf(r, block, name);
  return {
    unitCost: cost.unitCost,
    salePrice: price.salePrice,
    packages: packaging.packages,
    issues: [...cost.issues, ...price.issues, ...packaging.issues],
  };
}

function planBeverage(r: BeverageRow, block: BeverageBlock): PlannedBeverage[] {
  // A linha existe pela célula original; a correção só troca o texto (senão uma correção
  // antiga criaria bebida numa linha que esvaziou).
  if (!hasText(rawCellValue(r, COL.name))) return [];
  const raw = cellValue(r, COL.name);
  if (!hasText(raw)) return [];
  const name = toDisplayName(raw);
  const values = readRowValues(r, block, name);
  const names = r.splits[toNeighborhoodKey(name)] ?? [name];
  return names.map((variant, index) => {
    const supply = {
      ...toSupply(variant, values.unitCost),
      packages: values.packages,
    };
    return {
      supply,
      product: toProduct(r, block, supply, values.salePrice),
      // Os avisos são da linha: aparecem uma vez só, não uma por sabor.
      issues: index === 0 ? values.issues : [],
    };
  });
}

function planBlock(
  base: Omit<BeverageRow, 'excelRow'>,
  block: BeverageBlock,
): PlannedBeverage[] {
  const rows = parseRowRange(block.rows) ?? [];
  return rows.flatMap((excelRow) => planBeverage({ ...base, excelRow }, block));
}

/**
 * Plano da importação de bebidas: cada linha vira um insumo (`un`, com a embalagem de
 * compra) e um produto que leva 1 un dele. Reaproveita a comparação e a gravação do
 * cardápio (`diffMenu`, `PrismaMenuImportTarget`); não toca no banco.
 *
 * @example buildBeveragePlan(grids, BEVERAGE_LAYOUT, { 'Plan1!B44': 'petra 600ml retornavel' })
 */
export function buildBeveragePlan(
  grids: Map<string, FormulaGrid>,
  layout: BeverageLayout,
  corrections: MenuCorrections,
): MenuPlan {
  const grid = grids.get(layout.sheet);
  if (!grid)
    return {
      source: 'bebidas',
      supplies: [],
      products: [],
      issues: [
        {
          severity: 'error',
          where: layout.sheet,
          message: `aba "${layout.sheet}" não existe na planilha (abas: ${[...grids.keys()].join(', ') || 'nenhuma'})`,
        },
      ],
    };
  const base = {
    sheet: layout.sheet,
    grid,
    corrections,
    splits: layout.splits,
  };
  const planned = layout.blocks.flatMap((block) => planBlock(base, block));
  const products = planned.map((p) => p.product);
  return {
    source: 'bebidas',
    supplies: planned.map((p) => p.supply),
    products,
    issues: [
      ...planned.flatMap((p) => p.issues),
      ...duplicateProductIssues(products),
    ],
  };
}
