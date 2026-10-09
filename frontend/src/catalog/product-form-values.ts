import { toApiMoney } from '../api/money';
import { formatQuantity, toApiQuantity } from '../api/quantity';
import type {
  Product,
  ProductComponentInput,
  ProductInput,
  Supply,
} from '../api/types';
import { parseBundleRows, type BundleRowValues } from './bundle-form-values';
import { parseEntryName, type Parsed } from './catalog-values';

/** Mesmo limite do backend. */
const MAX_DESCRIPTION_LENGTH = 300;

/** Linha da composição como digitada: id do insumo (do select) e quantidade em texto. */
export interface ComponentRowValues {
  supplyId: string;
  quantity: string;
}

export interface ProductFormValues {
  categoryId: string;
  menuNumber: string;
  name: string;
  salePrice: string;
  description: string;
  components: ComponentRowValues[];
  /** Combo: itens fixos no lugar da composição, sem número no cardápio. */
  isCombo: boolean;
  bundleItems: BundleRowValues[];
}

export const EMPTY_COMPONENT: ComponentRowValues = {
  supplyId: '',
  quantity: '',
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  categoryId: '',
  menuNumber: '',
  name: '',
  salePrice: '',
  description: '',
  components: [],
  isCombo: false,
  bundleItems: [],
};

/** Preenche o formulário com um produto cadastrado, para edição. */
export function productFormValuesOf(product: Product): ProductFormValues {
  return {
    categoryId: String(product.categoryId),
    menuNumber: product.menuNumber === null ? '' : String(product.menuNumber),
    name: product.name,
    salePrice: product.salePrice?.replace('.', ',') ?? '',
    description: product.description ?? '',
    components: product.components.map((c) => ({
      supplyId: String(c.supplyId),
      quantity: formatQuantity(c.quantity),
    })),
    isCombo: product.bundleItems.length > 0,
    bundleItems: product.bundleItems.map((item) => ({
      productId: String(item.productId),
      quantity: String(item.quantity),
    })),
  };
}

function parseCategory(text: string): Parsed<number> {
  const id = Number(text);
  if (Number.isInteger(id) && id > 0) return { ok: true, value: id };
  return { ok: false, error: 'Escolha a categoria do item' };
}

function parseMenuNumber(text: string): Parsed<number | null> {
  const typed = text.trim();
  if (!typed) return { ok: true, value: null };
  if (/^\d{1,3}$/.test(typed) && Number(typed) > 0)
    return { ok: true, value: Number(typed) };
  return {
    ok: false,
    error: `Número do cardápio inválido "${text}": esperado inteiro de 1 a 999 (ex.: 9)`,
  };
}

/**
 * Preço digitado (vírgula ou ponto, até 2 casas) no formato da API; em branco = sem preço.
 *
 * @example parseSalePrice('17,80') // { ok: true, value: '17.80' }
 */
export function parseSalePrice(text: string): Parsed<string | null> {
  if (!text.trim()) return { ok: true, value: null };
  const price = toApiMoney(text);
  if (price !== null) return { ok: true, value: price };
  return {
    ok: false,
    error: `Preço inválido "${text}": digite só números, até 2 casas (ex.: 17,80)`,
  };
}

function parseDescription(text: string): Parsed<string | null> {
  const description = text.trim();
  if (description.length <= MAX_DESCRIPTION_LENGTH)
    return { ok: true, value: description || null };
  return {
    ok: false,
    error: `A descrição passa de ${MAX_DESCRIPTION_LENGTH} caracteres: recebido ${description.length}`,
  };
}

function parseComponentRow(
  row: ComponentRowValues,
  index: number,
): Parsed<ProductComponentInput> {
  if (!row.supplyId)
    return { ok: false, error: `Escolha o insumo da linha ${index + 1}` };
  const quantity = toApiQuantity(row.quantity);
  if (quantity === null || !/[1-9]/.test(quantity))
    return {
      ok: false,
      error: `Quantidade da linha ${index + 1} inválida "${row.quantity}": esperado número maior que zero, até 3 casas (ex.: 0,036)`,
    };
  return { ok: true, value: { supplyId: Number(row.supplyId), quantity } };
}

function assertDistinct(
  components: ProductComponentInput[],
): Parsed<ProductComponentInput[]> {
  const ids = components.map((c) => c.supplyId);
  if (new Set(ids).size === ids.length) return { ok: true, value: components };
  return {
    ok: false,
    error: 'O mesmo insumo aparece em duas linhas: some as quantidades numa só',
  };
}

/** Linhas totalmente em branco são ignoradas (abriu e não usou). */
function parseComponents(
  rows: ComponentRowValues[],
): Parsed<ProductComponentInput[]> {
  const components: ProductComponentInput[] = [];
  const filled = rows.filter((r) => r.supplyId || r.quantity.trim());
  for (const [index, row] of filled.entries()) {
    const parsed = parseComponentRow(row, index);
    if (!parsed.ok) return parsed;
    components.push(parsed.value);
  }
  return assertDistinct(components);
}

/**
 * Valida o formulário e monta o corpo da API; `active` vem do produto (true se novo).
 *
 * @example buildProductInput({ categoryId: '1', menuNumber: '9', name: 'X Salada', salePrice: '17,80', description: '', components: [] }, true)
 */
export function buildProductInput(
  values: ProductFormValues,
  active: boolean,
): Parsed<ProductInput> {
  // Combo não tem receita nem número próprios: o que ficou digitado antes não vai.
  if (values.isCombo) return buildComboInput(values, active);
  const plain = buildPlainInput(values, active);
  if (!plain.ok) return plain;
  return { ok: true, value: { ...plain.value, bundleItems: [] } };
}

function buildComboInput(
  values: ProductFormValues,
  active: boolean,
): Parsed<ProductInput> {
  const plain = buildPlainInput(
    { ...values, menuNumber: '', components: [] },
    active,
  );
  if (!plain.ok) return plain;
  const bundleItems = parseBundleRows(values.bundleItems);
  if (!bundleItems.ok) return bundleItems;
  return {
    ok: true,
    value: { ...plain.value, bundleItems: bundleItems.value },
  };
}

function buildPlainInput(
  values: ProductFormValues,
  active: boolean,
): Parsed<Omit<ProductInput, 'bundleItems'>> {
  const categoryId = parseCategory(values.categoryId);
  if (!categoryId.ok) return categoryId;
  const menuNumber = parseMenuNumber(values.menuNumber);
  if (!menuNumber.ok) return menuNumber;
  const name = parseEntryName(values.name, 'nome do item');
  if (!name.ok) return name;
  const salePrice = parseSalePrice(values.salePrice);
  if (!salePrice.ok) return salePrice;
  const description = parseDescription(values.description);
  if (!description.ok) return description;
  const components = parseComponents(values.components);
  if (!components.ok) return components;
  return {
    ok: true,
    value: {
      categoryId: categoryId.value,
      menuNumber: menuNumber.value,
      name: name.value,
      description: description.value,
      salePrice: salePrice.value,
      active,
      components: components.value,
    },
  };
}

/**
 * Unidade do insumo escolhido numa linha, para o rótulo da quantidade.
 *
 * @example unitOfSupply(supplies, '4') // 'kg'
 */
export function unitOfSupply(supplies: Supply[], supplyId: string): string {
  return supplies.find((s) => String(s.id) === supplyId)?.countUnit ?? 'un';
}

/**
 * Produto lido de volta no formato de gravação (para ativar/desativar sem abrir o formulário).
 *
 * @example saveProduct(product.id, { ...productInputOf(product), active: false })
 */
export function productInputOf(product: Product): ProductInput {
  return {
    categoryId: product.categoryId,
    menuNumber: product.menuNumber,
    name: product.name,
    description: product.description,
    salePrice: product.salePrice,
    active: product.active,
    components: product.components.map((c) => ({
      supplyId: c.supplyId,
      quantity: c.quantity,
    })),
    bundleItems: product.bundleItems.map(({ productId, quantity }) => ({
      productId,
      quantity,
    })),
  };
}
