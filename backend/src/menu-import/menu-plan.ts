import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { computeCmv } from '../products/cmv.js';
import type { CellValue, ImportIssue } from '../ticket-import/import-types.js';
import { columnIndex, formulaCellAt, parseRowRange } from './cell-address.js';
import { effectiveCell, planRowComponents } from './row-components.js';
import { COSTS_SHEET, numericCell, planSupplies } from './supply-costs.js';
import type {
  DescriptionSource,
  FormulaGrid,
  MenuCorrections,
  MenuMapping,
  MenuPlan,
  PlannedComponent,
  PlannedProduct,
  ProductGroup,
} from './menu-types.js';

// Colunas das abas de custo (Lanches, Lanches_Artesanal): B nome, AJ nome do cardápio,
// AK CMV calculado pela planilha, AO preço de venda (PV = CMV ÷ 0,42).
const NAME_COLUMN = 'B';
const MENU_NAME_COLUMN = 'AJ';
const CMV_COLUMN = 'AK';
const PRICE_COLUMN = 'AO';
// Custos com 4 casas mudam o CMV em frações de centavo; mais que isso é erro de mapeamento.
const CMV_TOLERANCE = 0.01 + 1e-9;

type Grids = Map<string, FormulaGrid>;

interface PlanContext {
  grids: Grids;
  mapping: MenuMapping;
  corrections: MenuCorrections;
  costByKey: Map<string, string>;
}

/**
 * Preço de venda arredondado para cima em R$ 0,10 (decisão do plano: 17,7177 → 17,80).
 *
 * @example roundUpToTenCents(17.7177) // '17.80'
 */
export function roundUpToTenCents(value: number): string {
  // Arredonda o ruído de float antes do teto: 17,8 pode chegar como 178.00000000001 décimos.
  const tenths = Math.ceil(Math.round(value * 10 * 1e6) / 1e6);
  return (tenths / 10).toFixed(2);
}

const textOf = (value: CellValue): string =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';

const issueAt = (
  severity: ImportIssue['severity'],
  where: string,
  message: string,
): ImportIssue => ({ severity, where, message });

function descriptionsOf(grids: Grids, source: DescriptionSource | null) {
  const byName = new Map<string, string>();
  const grid = source ? grids.get(source.sheet) : undefined;
  if (!source || !grid) return byName;
  const [nameColumn, textColumn] = [
    source.nameColumn,
    source.descriptionColumn,
  ].map(columnIndex);
  grid.forEach((_, row) => {
    const name = textOf(formulaCellAt(grid, row, nameColumn).value);
    const text = textOf(formulaCellAt(grid, row, textColumn).value);
    if (name && text) byName.set(toNeighborhoodKey(name), text);
  });
  return byName;
}

/** Uma linha de produto sendo lida: onde está e o contexto do plano. */
interface ProductRow {
  ctx: PlanContext;
  group: ProductGroup;
  grid: FormulaGrid;
  /** Linha a partir de 0. */
  row: number;
}

function cellText(r: ProductRow, letter: string): string {
  const address = `${r.group.sheet}!${letter}${r.row + 1}`;
  const cell = formulaCellAt(r.grid, r.row, columnIndex(letter));
  return textOf(effectiveCell(cell, address, r.ctx.corrections).value);
}

const numberAt = (r: ProductRow, letter: string): number | null =>
  numericCell(formulaCellAt(r.grid, r.row, columnIndex(letter)).value);

const notNull = (issue: ImportIssue | null): issue is ImportIssue =>
  issue !== null;

function priceIssue(r: ProductRow, name: string, price: number | null) {
  if (price !== null) return null;
  const where = `${r.group.sheet}!${PRICE_COLUMN}${r.row + 1}`;
  return issueAt(
    'error',
    where,
    `preço de venda (PV) de "${name}" não é número`,
  );
}

function cmvIssue(
  product: PlannedProduct,
  sheetCmv: number | null,
  corrected: boolean,
): ImportIssue | null {
  const gap =
    sheetCmv === null ? Infinity : Math.abs(Number(product.cmv) - sheetCmv);
  if (gap <= CMV_TOLERANCE) return null;
  const message = `CMV recalculado ${product.cmv} não bate com o da planilha (${sheetCmv?.toFixed(4) ?? 'vazio'}) em "${product.name}"`;
  const where = `${product.where} (${CMV_COLUMN})`;
  // Linha corrigida à mão não tem como bater: vira aviso para o usuário conferir.
  if (corrected)
    return issueAt(
      'warning',
      where,
      `${message}; esperado, a linha tem correções`,
    );
  return issueAt('error', where, `${message}: confira o mapeamento`);
}

function menuNameIssue(r: ProductRow, name: string): ImportIssue | null {
  const menuName = cellText(r, MENU_NAME_COLUMN);
  if (!menuName || toNeighborhoodKey(menuName) === toNeighborhoodKey(name))
    return null;
  return issueAt(
    'warning',
    `${r.group.sheet}!${NAME_COLUMN}${r.row + 1}`,
    `nome "${name}" difere do nome do cardápio "${menuName}" (coluna ${MENU_NAME_COLUMN}); vale o da coluna ${NAME_COLUMN}`,
  );
}

function toPlannedProduct(
  r: ProductRow,
  name: string,
  components: PlannedComponent[],
  price: number | null,
  descriptions: Map<string, string>,
): PlannedProduct {
  const nameKey = toNeighborhoodKey(name);
  const costed = components.map((c) => ({
    quantity: c.quantity,
    unitCost: r.ctx.costByKey.get(c.supplyKey) ?? null,
  }));
  return {
    where: `${r.group.sheet}!${r.row + 1}`,
    category: r.group.category,
    categoryKey: toNeighborhoodKey(r.group.category),
    name,
    nameKey,
    description: descriptions.get(nameKey) ?? null,
    salePrice: roundUpToTenCents(price ?? 0),
    components,
    cmv: computeCmv(costed).cmv,
  };
}

function planProduct(r: ProductRow, descriptions: Map<string, string>) {
  const name = cellText(r, NAME_COLUMN);
  if (!name) return { product: null, issues: [] };
  const { sheet } = r.group;
  const { corrections, mapping } = r.ctx;
  const rowPlan = planRowComponents({
    sheet,
    grid: r.grid,
    row: r.row,
    corrections,
    portions: mapping.portions,
  });
  const price = numberAt(r, PRICE_COLUMN);
  const product = toPlannedProduct(
    r,
    name,
    rowPlan.components,
    price,
    descriptions,
  );
  const extra = [
    priceIssue(r, name, price),
    cmvIssue(product, numberAt(r, CMV_COLUMN), rowPlan.corrected),
    menuNameIssue(r, name),
  ];
  return { product, issues: [...rowPlan.issues, ...extra.filter(notNull)] };
}

function planGroup(ctx: PlanContext, group: ProductGroup) {
  const grid = ctx.grids.get(group.sheet);
  if (!grid)
    return {
      products: [],
      issues: [
        issueAt(
          'error',
          group.sheet,
          `aba "${group.sheet}" não existe na planilha`,
        ),
      ],
    };
  const descriptions = descriptionsOf(ctx.grids, group.descriptions);
  const planned = parseRowRange(group.rows)!.map((excelRow) =>
    planProduct({ ctx, group, grid, row: excelRow - 1 }, descriptions),
  );
  return {
    products: planned.flatMap((p) => (p.product ? [p.product] : [])),
    issues: planned.flatMap((p) => p.issues),
  };
}

function unknownSupplyIssues(
  mapping: MenuMapping,
  supplyKeys: Set<string>,
): ImportIssue[] {
  return Object.entries(mapping.portions).flatMap(([cell, parts]) =>
    parts
      .filter((part) => !supplyKeys.has(toNeighborhoodKey(part.supply)))
      .map((part) =>
        issueAt(
          'error',
          `mapeamento portions.${cell}`,
          `insumo "${part.supply}" não está em supplies`,
        ),
      ),
  );
}

function duplicateProductIssues(products: PlannedProduct[]): ImportIssue[] {
  const keys = products.map((p) => `${p.categoryKey}|${p.nameKey}`);
  return products
    .filter((_, i) => keys.indexOf(keys[i]) !== i)
    .map((p) =>
      issueAt(
        'error',
        p.where,
        `"${p.name}" aparece mais de uma vez em ${p.category}`,
      ),
    );
}

/**
 * Plano da importação do cardápio: insumos com custo, lanches com composição, preço e CMV,
 * mais os problemas achados. Não toca no banco (testável com grids falsos).
 *
 * @example buildMenuPlan(grids, parseMenuMapping(json), corrections)
 */
export function buildMenuPlan(
  grids: Grids,
  mapping: MenuMapping,
  corrections: MenuCorrections,
): MenuPlan {
  const costs = grids.get(COSTS_SHEET);
  if (!costs)
    return {
      supplies: [],
      products: [],
      issues: [
        issueAt(
          'error',
          COSTS_SHEET,
          `aba "${COSTS_SHEET}" não existe na planilha`,
        ),
      ],
    };
  const planned = planSupplies(costs, mapping.supplies);
  const costByKey = new Map(
    planned.supplies.map((s) => [s.nameKey, s.unitCost]),
  );
  const ctx: PlanContext = { grids, mapping, corrections, costByKey };
  const groups = mapping.groups.map((group) => planGroup(ctx, group));
  const products = groups.flatMap((g) => g.products);
  const issues = [
    ...planned.issues,
    ...unknownSupplyIssues(mapping, new Set(costByKey.keys())),
    ...groups.flatMap((g) => g.issues),
    ...duplicateProductIssues(products),
  ];
  return { supplies: planned.supplies, products, issues };
}
