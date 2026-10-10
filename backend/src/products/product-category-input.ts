import { BadRequestException } from '@nestjs/common';
import {
  parseBoolean,
  parseId,
  parseObject,
  parseText,
} from '../common/input-parsers.js';

const MAX_NAME_LENGTH = 60;

export interface CategoryInput {
  name: string;
  active: boolean;
}

/**
 * Corpo de criar/editar categoria do cardápio; sem `active`, a categoria fica ativa.
 *
 * @example parseCategoryInput({ name: ' Combos ' }) // { name: 'Combos', active: true }
 */
export function parseCategoryInput(body: unknown): CategoryInput {
  const fields = parseObject(body, 'categoria');
  const name = parseText(fields.name, 'name', MAX_NAME_LENGTH);
  const active =
    fields.active === undefined ? true : parseBoolean(fields.active, 'active');
  return { name, active };
}

/**
 * Corpo de `PUT /product-categories/order`: todos os ids, na ordem nova, sem repetir.
 *
 * @example parseCategoryOrder({ ids: [3, 1, 2] }) // [3, 1, 2]
 */
export function parseCategoryOrder(body: unknown): number[] {
  const { ids } = parseObject(body, 'ordem das categorias');
  if (!Array.isArray(ids) || ids.length === 0)
    throw new BadRequestException(
      `Campo "ids" inválido: recebido ${JSON.stringify(ids)}, esperado lista não vazia de ids de categoria`,
    );
  const parsed = ids.map((id, index) => parseId(id, `ids[${index}]`));
  const repeated = parsed.find((id, index) => parsed.indexOf(id) !== index);
  if (repeated !== undefined)
    throw new BadRequestException(
      `Campo "ids" com id repetido: ${repeated}; esperado cada categoria uma vez`,
    );
  return parsed;
}

/**
 * Corpo de `PUT /product-categories/:id/addon-category`: o id da categoria de adicionais ou
 * null (não aceita adicionais).
 *
 * @example parseAddonCategoryChoice({ addonCategoryId: 3 }) // 3
 */
export function parseAddonCategoryChoice(body: unknown): number | null {
  const { addonCategoryId } = parseObject(body, 'adicionais da categoria');
  if (addonCategoryId === null) return null;
  if (addonCategoryId === undefined)
    throw new BadRequestException(
      'Campo "addonCategoryId" ausente: esperado id da categoria de adicionais ou null',
    );
  return parseId(addonCategoryId, 'addonCategoryId');
}
