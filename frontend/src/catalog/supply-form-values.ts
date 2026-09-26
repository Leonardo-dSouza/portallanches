import { formatQuantity, toApiQuantity } from '../api/quantity';
import type { Supply, SupplyInput, SupplyPackage } from '../api/types';
import { parseEntryName, type Parsed } from './catalog-values';

/** Mesmo limite do backend para unidade e nome de embalagem. */
const MAX_UNIT_LENGTH = 20;

/** Sugestões do campo "Unidade de contagem"; o campo aceita qualquer texto. */
export const COUNT_UNIT_SUGGESTIONS = [
  'un',
  'kg',
  'g',
  'L',
  'ml',
  'bandeja',
  'pacote',
  'fatia',
] as const;

/** Embalagem como digitada: nome e quantidade em texto. */
export interface PackageRowValues {
  name: string;
  quantity: string;
}

export interface SupplyFormValues {
  name: string;
  countUnit: string;
  minStock: string;
  packages: PackageRowValues[];
}

export const EMPTY_PACKAGE: PackageRowValues = { name: '', quantity: '' };

export const EMPTY_SUPPLY_FORM: SupplyFormValues = {
  name: '',
  countUnit: 'un',
  minStock: '',
  packages: [],
};

/** Preenche o formulário com um insumo cadastrado, para edição. */
export function supplyFormValuesOf(supply: Supply): SupplyFormValues {
  return {
    name: supply.name,
    countUnit: supply.countUnit,
    minStock: supply.minStock === null ? '' : formatQuantity(supply.minStock),
    packages: supply.packages.map((p) => ({
      name: p.name,
      quantity: formatQuantity(p.quantity),
    })),
  };
}

function parseCountUnit(text: string): Parsed<string> {
  const unit = text.trim();
  if (unit && unit.length <= MAX_UNIT_LENGTH) return { ok: true, value: unit };
  return {
    ok: false,
    error: `Unidade de contagem inválida "${text}": esperado texto de 1 a ${MAX_UNIT_LENGTH} caracteres (ex.: un, kg)`,
  };
}

function parseMinStock(text: string): Parsed<string | null> {
  if (!text.trim()) return { ok: true, value: null };
  const quantity = toApiQuantity(text);
  if (quantity !== null) return { ok: true, value: quantity };
  return {
    ok: false,
    error: `Estoque mínimo inválido "${text}": digite só números, até 3 casas (ex.: 4 ou 2,5)`,
  };
}

function parsePackageRow(row: PackageRowValues): Parsed<SupplyPackage> {
  const name = row.name.trim();
  if (!name || name.length > MAX_UNIT_LENGTH)
    return {
      ok: false,
      error: `Nome de embalagem inválido "${row.name}": esperado texto de 1 a ${MAX_UNIT_LENGTH} caracteres (ex.: caixa)`,
    };
  const quantity = toApiQuantity(row.quantity);
  if (quantity === null || !/[1-9]/.test(quantity))
    return {
      ok: false,
      error: `Quantidade da embalagem "${name}" inválida "${row.quantity}": esperado número maior que zero`,
    };
  return { ok: true, value: { name, quantity } };
}

/** Linhas de embalagem totalmente em branco são ignoradas (o caixa abriu e não usou). */
function parsePackages(rows: PackageRowValues[]): Parsed<SupplyPackage[]> {
  const packages: SupplyPackage[] = [];
  for (const row of rows.filter((r) => r.name.trim() || r.quantity.trim())) {
    const parsed = parsePackageRow(row);
    if (!parsed.ok) return parsed;
    packages.push(parsed.value);
  }
  return { ok: true, value: packages };
}

/**
 * Valida o formulário e monta o corpo da API; `active` vem do insumo (true se novo).
 *
 * @example buildSupplyInput({ name: 'Leite condensado', countUnit: 'un', minStock: '4', packages: [] }, true)
 */
export function buildSupplyInput(
  values: SupplyFormValues,
  active: boolean,
): Parsed<SupplyInput> {
  const name = parseEntryName(values.name, 'nome do insumo');
  if (!name.ok) return name;
  const countUnit = parseCountUnit(values.countUnit);
  if (!countUnit.ok) return countUnit;
  const minStock = parseMinStock(values.minStock);
  if (!minStock.ok) return minStock;
  const packages = parsePackages(values.packages);
  if (!packages.ok) return packages;
  return {
    ok: true,
    value: {
      name: name.value,
      countUnit: countUnit.value,
      minStock: minStock.value,
      active,
      packages: packages.value,
    },
  };
}

/**
 * Embalagens em texto para a tabela.
 *
 * @example describePackages({ countUnit: 'un', packages: [{ name: 'caixa', quantity: '36' }] }) // 'caixa = 36 un'
 */
export function describePackages(
  supply: Pick<Supply, 'countUnit' | 'packages'>,
): string {
  if (supply.packages.length === 0) return '—';
  return supply.packages
    .map((p) => `${p.name} = ${formatQuantity(p.quantity)} ${supply.countUnit}`)
    .join(', ');
}
