import { BadRequestException } from '@nestjs/common';
import {
  parseBoolean,
  parseId,
  parseIdOrder,
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
  return parseIdOrder(body, 'categoria');
}

/** O id de outra categoria num campo próprio, ou null para desligar. */
function parseCategoryLink(
  body: unknown,
  field: 'addonCategoryId' | 'choiceCategoryId',
  what: string,
): number | null {
  const value = parseObject(body, `${what} da categoria`)[field];
  if (value === null) return null;
  if (value === undefined)
    throw new BadRequestException(
      `Campo "${field}" ausente: esperado id da categoria de ${what} ou null`,
    );
  return parseId(value, field);
}

/**
 * Corpo de `PUT /product-categories/:id/addon-category`: o id da categoria de adicionais ou
 * null (não aceita adicionais).
 *
 * @example parseAddonCategoryChoice({ addonCategoryId: 3 }) // 3
 */
export function parseAddonCategoryChoice(body: unknown): number | null {
  return parseCategoryLink(body, 'addonCategoryId', 'adicionais');
}

/**
 * Corpo de `PUT /product-categories/:id/choice-category`: o id da categoria de onde sai a
 * escolha obrigatória (o pão do artesanal, 2026-11-08) ou null (sem escolha).
 *
 * @example parseChoiceCategoryLink({ choiceCategoryId: 12 }) // 12
 */
export function parseChoiceCategoryLink(body: unknown): number | null {
  return parseCategoryLink(body, 'choiceCategoryId', 'escolha');
}

/**
 * Corpo de `PUT /product-categories/:id/product-order`: todos os produtos da categoria, na
 * ordem nova das teclas, sem repetir.
 *
 * @example parseProductOrder({ ids: [66, 67, 65] }) // [66, 67, 65]
 */
export function parseProductOrder(body: unknown): number[] {
  return parseIdOrder(body, 'produto');
}
