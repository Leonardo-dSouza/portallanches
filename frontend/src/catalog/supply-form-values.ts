import { formatMoney } from '../api/money';
import { formatQuantity, toApiDecimal, toApiQuantity } from '../api/quantity';
import type { Supply, SupplyInput, SupplyPackage } from '../api/types';
import { parseEntryName, type Parsed } from './catalog-values';
import { parseSalePrice } from './product-form-values';

/** Mesmo limite do backend para unidade e nome de embalagem. */
const MAX_UNIT_LENGTH = 20;
/** Mesmo limite do backend: custo por grama/sachê precisa de casas abaixo do centavo. */
const UNIT_COST_DECIMALS = 4;

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
  unitCost: string;
  deductOnSale: boolean;
  /** Id da seção em texto (valor do select); '' = sem seção. */
  sectionId: string;
  /** Só usado quando o insumo tem produto 1:1; '' = sem preço. */
  salePrice: string;
  packages: PackageRowValues[];
}

export const EMPTY_PACKAGE: PackageRowValues = { name: '', quantity: '' };

export const EMPTY_SUPPLY_FORM: SupplyFormValues = {
  name: '',
  countUnit: 'un',
  minStock: '',
  unitCost: '',
  deductOnSale: true,
  sectionId: '',
  salePrice: '',
  packages: [],
};

/** Preenche o formulário com um insumo cadastrado, para edição. */
export function supplyFormValuesOf(supply: Supply): SupplyFormValues {
  return {
    name: supply.name,
    countUnit: supply.countUnit,
    minStock: supply.minStock === null ? '' : formatQuantity(supply.minStock),
    unitCost: supply.unitCost === null ? '' : formatQuantity(supply.unitCost),
    deductOnSale: supply.deductOnSale,
    sectionId: supply.sectionId === null ? '' : String(supply.sectionId),
    salePrice: supply.saleProduct?.salePrice?.replace('.', ',') ?? '',
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

function parseUnitCost(text: string): Parsed<string | null> {
  if (!text.trim()) return { ok: true, value: null };
  const cost = toApiDecimal(text, UNIT_COST_DECIMALS);
  if (cost !== null) return { ok: true, value: cost };
  return {
    ok: false,
    error: `Custo inválido "${text}": digite só números, até ${UNIT_COST_DECIMALS} casas (ex.: 39,90)`,
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

/** O preço só vai no corpo quando o insumo tem produto 1:1; nos outros, não mexe. */
function withSalePrice(
  input: SupplyInput,
  values: SupplyFormValues,
  sellable: boolean,
): Parsed<SupplyInput> {
  if (!sellable) return { ok: true, value: input };
  const salePrice = parseSalePrice(values.salePrice);
  if (!salePrice.ok) return salePrice;
  return { ok: true, value: { ...input, salePrice: salePrice.value } };
}

/**
 * Valida o formulário e monta o corpo da API; `active` vem do insumo (true se novo) e
 * `sellable` diz se o insumo tem produto 1:1 para receber o preço de venda.
 *
 * @example buildSupplyInput({ name: 'Leite condensado', countUnit: 'un', minStock: '4', unitCost: '', deductOnSale: true, sectionId: '5', salePrice: '', packages: [] }, true, false)
 */
export function buildSupplyInput(
  values: SupplyFormValues,
  active: boolean,
  sellable: boolean,
): Parsed<SupplyInput> {
  const name = parseEntryName(values.name, 'nome do insumo');
  if (!name.ok) return name;
  const countUnit = parseCountUnit(values.countUnit);
  if (!countUnit.ok) return countUnit;
  const minStock = parseMinStock(values.minStock);
  if (!minStock.ok) return minStock;
  const unitCost = parseUnitCost(values.unitCost);
  if (!unitCost.ok) return unitCost;
  const packages = parsePackages(values.packages);
  if (!packages.ok) return packages;
  const input: SupplyInput = {
    name: name.value,
    countUnit: countUnit.value,
    minStock: minStock.value,
    unitCost: unitCost.value,
    deductOnSale: values.deductOnSale,
    sectionId: values.sectionId ? Number(values.sectionId) : null,
    active,
    packages: packages.value,
  };
  return withSalePrice(input, values, sellable);
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

/**
 * Custo por unidade para a tabela.
 *
 * @example describeUnitCost({ countUnit: 'kg', unitCost: '39.9' }) // 'R$ 39,90 / kg'
 */
export function describeUnitCost(
  supply: Pick<Supply, 'countUnit' | 'unitCost'>,
): string {
  if (supply.unitCost === null) return '—';
  return `${formatMoney(supply.unitCost)} / ${supply.countUnit}`;
}

/**
 * Preço de venda do produto 1:1 para a tabela; '—' quando o insumo não se vende sozinho.
 *
 * @example describeSalePrice({ saleProduct: { id: 9, name: 'Coca Cola 2l', salePrice: '15.00', importSource: null } }) // 'R$ 15,00'
 */
export function describeSalePrice(supply: Pick<Supply, 'saleProduct'>): string {
  const price = supply.saleProduct?.salePrice;
  return price ? formatMoney(price) : '—';
}
