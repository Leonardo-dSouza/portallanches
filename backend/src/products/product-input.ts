import { BadRequestException } from '@nestjs/common';
import {
  parseBoolean,
  parseId,
  parseObject,
  parseText,
} from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import { parseQuantity } from '../common/quantity.js';

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 300;
// O X Tudo da planilha tem ~15 insumos contando embalagens; 40 dá folga sem aceitar lixo.
const MAX_COMPONENTS = 40;

/** Quanto de um insumo vai no produto, na unidade de contagem do insumo. */
export interface ProductComponentInput {
  supplyId: number;
  quantity: string;
}

export interface ProductInput {
  categoryId: number;
  /** Número do cardápio impresso; null = sem número (ex.: adicionais). */
  menuNumber: number | null;
  name: string;
  description: string | null;
  /** Preço de venda com 2 casas; null = ainda sem preço. */
  salePrice: string | null;
  active: boolean;
  components: ProductComponentInput[];
}

const absent = (value: unknown) => value === undefined || value === null;

function parseComponent(raw: unknown, index: number): ProductComponentInput {
  const fields = parseObject(raw, `componente ${index + 1}`);
  return {
    supplyId: parseId(fields.supplyId, `components[${index}].supplyId`),
    quantity: parseQuantity(
      fields.quantity,
      `components[${index}].quantity`,
      false,
    ),
  };
}

function assertDistinctSupplies(components: ProductComponentInput[]): void {
  const ids = components.map((c) => c.supplyId);
  const repeated = ids.find((id, i) => ids.indexOf(id) !== i);
  if (repeated === undefined) return;
  throw new BadRequestException(
    `Insumo repetido na composição: supplyId ${repeated} aparece mais de uma vez, esperado uma linha por insumo (some as quantidades)`,
  );
}

function parseComponents(raw: unknown): ProductComponentInput[] {
  if (absent(raw)) return [];
  if (!Array.isArray(raw) || raw.length > MAX_COMPONENTS)
    throw new BadRequestException(
      `Campo "components" inválido: recebido ${JSON.stringify(raw)}, esperado lista com até ${MAX_COMPONENTS} insumos`,
    );
  const components = raw.map(parseComponent);
  assertDistinctSupplies(components);
  return components;
}

function parseDescription(raw: unknown): string | null {
  if (absent(raw) || (typeof raw === 'string' && raw.trim() === ''))
    return null;
  return parseText(raw, 'description', MAX_DESCRIPTION_LENGTH);
}

/**
 * Valida o corpo de um produto; `active` ausente vale true e composição ausente = vazia.
 *
 * @example parseProductInput({ categoryId: 1, name: 'X Salada', salePrice: 17.8, components: [{ supplyId: 4, quantity: 0.036 }] })
 */
export function parseProductInput(body: unknown): ProductInput {
  const fields = parseObject(body, 'produto');
  return {
    categoryId: parseId(fields.categoryId, 'categoryId'),
    menuNumber: absent(fields.menuNumber)
      ? null
      : parseId(fields.menuNumber, 'menuNumber'),
    name: parseText(fields.name, 'name', MAX_NAME_LENGTH),
    description: parseDescription(fields.description),
    salePrice: absent(fields.salePrice)
      ? null
      : parseMoney(fields.salePrice, 'salePrice', true),
    active: absent(fields.active)
      ? true
      : parseBoolean(fields.active, 'active'),
    components: parseComponents(fields.components),
  };
}
