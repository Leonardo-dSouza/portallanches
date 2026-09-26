import { normalizeDecimal } from '../common/quantity.js';
import { parseCellAddress, parseRowRange } from './cell-address.js';
import type {
  ColumnLookup,
  MappedSupply,
  MenuMapping,
  PortionPart,
  ProductGroup,
} from './menu-types.js';

type Json = Record<string, unknown>;

function invalid(where: string, raw: unknown, expected: string): never {
  throw new Error(
    `Mapeamento inválido em ${where}: recebido ${JSON.stringify(raw)}, esperado ${expected}`,
  );
}

function objectAt(raw: unknown, where: string): Json {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw))
    return raw as Json;
  return invalid(where, raw, 'objeto');
}

function listAt(raw: unknown, where: string): unknown[] {
  return Array.isArray(raw) ? raw : invalid(where, raw, 'lista');
}

function textAt(raw: unknown, where: string): string {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return invalid(where, raw, 'texto não vazio');
}

function decimalAt(raw: unknown, where: string): string {
  const decimal = normalizeDecimal(raw, 3);
  if (decimal !== null && Number(decimal) > 0) return decimal;
  return invalid(where, raw, 'número maior que zero com até 3 casas');
}

function cellAt(raw: unknown, where: string): string {
  const cell = textAt(raw, where).toUpperCase();
  return parseCellAddress(cell)
    ? cell
    : invalid(where, raw, 'célula (ex.: E6)');
}

function parseLookup(raw: unknown, where: string): ColumnLookup | null {
  if (raw === undefined || raw === null) return null;
  const fields = objectAt(raw, where);
  const column = (key: string) =>
    textAt(fields[key], `${where}.${key}`).toUpperCase();
  return {
    sheet: textAt(fields.sheet, `${where}.sheet`),
    nameColumn: column('nameColumn'),
    valueColumn: column('valueColumn'),
  };
}

function parseGroup(raw: unknown, index: number): ProductGroup {
  const where = `groups[${index}]`;
  const fields = objectAt(raw, where);
  const rows = textAt(fields.rows, `${where}.rows`);
  if (!parseRowRange(rows))
    invalid(`${where}.rows`, rows, 'faixa de linhas (ex.: 2-26)');
  return {
    sheet: textAt(fields.sheet, `${where}.sheet`),
    rows,
    category: textAt(fields.category, `${where}.category`),
    descriptions: parseLookup(fields.descriptions, `${where}.descriptions`),
    numbers: parseLookup(fields.numbers, `${where}.numbers`),
  };
}

function parsePackage(raw: unknown, where: string) {
  const fields = objectAt(raw, where);
  return {
    name: textAt(fields.name, `${where}.name`),
    quantity: decimalAt(fields.quantity, `${where}.quantity`),
  };
}

function parseSupply(raw: unknown, index: number): MappedSupply {
  const where = `supplies[${index}]`;
  const fields = objectAt(raw, where);
  const packages =
    fields.packages === undefined
      ? []
      : listAt(fields.packages, `${where}.packages`);
  return {
    name: textAt(fields.name, `${where}.name`),
    countUnit: textAt(fields.countUnit, `${where}.countUnit`),
    costCell: cellAt(fields.costCell, `${where}.costCell`),
    costPer: decimalAt(fields.costPer ?? '1', `${where}.costPer`),
    deductOnSale: fields.deductOnSale !== false,
    packages: packages.map((p, i) =>
      parsePackage(p, `${where}.packages[${i}]`),
    ),
  };
}

function parsePortion(raw: unknown, cell: string): PortionPart[] {
  const where = `portions.${cell}`;
  return listAt(raw, where).map((part, i) => {
    const fields = objectAt(part, `${where}[${i}]`);
    return {
      supply: textAt(fields.supply, `${where}[${i}].supply`),
      quantity: decimalAt(fields.quantity, `${where}[${i}].quantity`),
    };
  });
}

function parsePortions(raw: unknown): Record<string, PortionPart[]> {
  const entries = Object.entries(objectAt(raw, 'portions'));
  return Object.fromEntries(
    entries.map(([cell, parts]) => [
      cellAt(cell, `portions.${cell}`),
      parsePortion(parts, cell),
    ]),
  );
}

/**
 * Valida o JSON do mapeamento; qualquer problema vira Error citando o caminho e o valor.
 *
 * @example parseMenuMapping(JSON.parse(readFileSync('cardapio-mapeamento.json', 'utf8')))
 */
export function parseMenuMapping(raw: unknown): MenuMapping {
  const fields = objectAt(raw, 'raiz');
  return {
    groups: listAt(fields.groups, 'groups').map(parseGroup),
    supplies: listAt(fields.supplies, 'supplies').map(parseSupply),
    portions: parsePortions(fields.portions),
  };
}
