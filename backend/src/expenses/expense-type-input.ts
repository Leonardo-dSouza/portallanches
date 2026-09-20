import {
  parseBoolean,
  parseObject,
  parseText,
} from '../common/input-parsers.js';

const MAX_NAME_LENGTH = 80;

export interface ExpenseTypeInput {
  name: string;
  active: boolean;
}

/**
 * Tipo novo lançado na hora pelo caixa: nasce sempre ativo; só o admin
 * (PUT) desativa ou renomeia depois.
 *
 * @example parseNewExpenseTypeInput({ name: 'Gás' }) // { name: 'Gás', active: true }
 */
export function parseNewExpenseTypeInput(body: unknown): ExpenseTypeInput {
  const fields = parseObject(body, 'tipo de gasto');
  return {
    name: parseText(fields.name, 'name', MAX_NAME_LENGTH),
    active: true,
  };
}

/** @example parseExpenseTypeInput({ name: 'Gás', active: false }) */
export function parseExpenseTypeInput(body: unknown): ExpenseTypeInput {
  const fields = parseObject(body, 'tipo de gasto');
  return {
    name: parseText(fields.name, 'name', MAX_NAME_LENGTH),
    active: parseBoolean(fields.active, 'active'),
  };
}
