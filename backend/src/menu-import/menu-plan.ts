import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { computeCmv } from '../products/cmv.js';
import type { CellValue, ImportIssue } from '../ticket-import/import-types.js';
import { columnIndex, formulaCellAt, parseRowRange } from './cell-address.js';
import { effectiveCell, planRowComponents } from './row-components.js';
import { COSTS_SHEET, numericCell, planSupplies } from './supply-costs.js';
import type {
  ColumnLookup,
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

/** Valores de uma coluna de outra aba, pela chave do nome (sem acento/maiúsculas). */
function lookupByName(
  grids: Grids,
  source: ColumnLookup | null,
  corrections: MenuCorrections,
) {
  const byName = new Map<string, CellValue>();
  const grid = source ? grids.get(source.sheet) : undefined;
  if (!source || !grid) return byName;
  const nameColumn = columnIndex(source.nameColumn);
  const valueColumn = columnIndex(source.valueColumn);
  grid.forEach((_, row) => {
    // A correção no nome casa lanches de nome diferente no cardápio ("X Burguer Duplo Artesanal").
    const address = `${source.sheet}!${source.nameColumn}${row + 1}`;
    const nameCell = formulaCellAt(grid, row, nameColumn);
    const name = textOf(effectiveCell(nameCell, address, corrections).value);
    const value = formulaCellAt(grid, row, valueColumn).value;
    if (name && value !== null) byName.set(toNeighborhoodKey(name), value);
  });
  return byName;
}

/** Descrições e números do cardápio de um grupo, prontos para casar pelo nome. */
interface GroupLookups {
  descriptions: Map<string, CellValue>;
  numbers: Map<string, CellValue>;
}

function menuNumberOf(value: CellValue | undefined): number | null {
  const number = value === undefined ? null : numericCell(value);
  return number !== null && Number.isInteger(number) && number > 0
    ? number
    : null;
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

/**
 * Nome do produto: o do cardápio (AJ) quando existe, senão o da coluna B. Decisão do
 * usuário na sessão 6: a coluna B tinha nomes abreviados ou errados ("Add Cebola 250g"
 * com fórmula de 120 g), o AJ é o que vai para o cardápio.
 */
function productName(r: ProductRow): string {
  return cellText(r, MENU_NAME_COLUMN) || cellText(r, NAME_COLUMN);
}

function nameMismatchIssue(r: ProductRow): ImportIssue | null {
  const [sheetName, menuName] = [
    cellText(r, NAME_COLUMN),
    cellText(r, MENU_NAME_COLUMN),
  ];
  if (!sheetName || !menuName) return null;
  if (toNeighborhoodKey(sheetName) === toNeighborhoodKey(menuName)) return null;
  return issueAt(
    'warning',
    `${r.group.sheet}!${NAME_COLUMN}${r.row + 1}`,
    `nome "${sheetName}" difere do nome do cardápio "${menuName}" (coluna ${MENU_NAME_COLUMN}); vale o do cardápio`,
  );
}

function toPlannedProduct(
  r: ProductRow,
  name: string,
  components: PlannedComponent[],
  price: number | null,
  lookups: GroupLookups,
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
    menuNumber: menuNumberOf(lookups.numbers.get(nameKey)),
    description: textOf(lookups.descriptions.get(nameKey) ?? null) || null,
    salePrice: roundUpToTenCents(price ?? 0),
    components,
    cmv: computeCmv(costed).cmv,
  };
}

function planProduct(r: ProductRow, lookups: GroupLookups) {
  // A coluna B marca se a linha existe (e "skip" nela tira o lanche); o AJ só dá o nome.
  if (!cellText(r, NAME_COLUMN)) return { product: null, issues: [] };
  const name = productName(r);
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
  const product = toPlannedProduct(r, name, rowPlan.components, price, lookups);
  const extra = [
    priceIssue(r, name, price),
    cmvIssue(product, numberAt(r, CMV_COLUMN), rowPlan.corrected),
    nameMismatchIssue(r),
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
  const lookups: GroupLookups = {
    descriptions: lookupByName(ctx.grids, group.descriptions, ctx.corrections),
    numbers: lookupByName(ctx.grids, group.numbers, ctx.corrections),
  };
  const planned = parseRowRange(group.rows)!.map((excelRow) =>
    planProduct({ ctx, group, grid, row: excelRow - 1 }, lookups),
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

/** Mesmo nome duas vezes na mesma categoria: a gravação casaria os dois no mesmo produto. */
export function duplicateProductIssues(
  products: PlannedProduct[],
): ImportIssue[] {
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
      source: 'cardapio',
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
    planned.supplies.flatMap((s) =>
      s.unitCost === null ? [] : [[s.nameKey, s.unitCost] as const],
    ),
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
  return { source: 'cardapio', supplies: planned.supplies, products, issues };
}
