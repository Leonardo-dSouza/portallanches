import { parseObject, parseText } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';

const MAX_DESCRIPTION_LENGTH = 200;

/** Corpo de gasto já validado. */
export interface ExpenseInput {
  description: string;
  amount: string;
}

/**
 * Valida o corpo de um gasto vindo da API.
 *
 * @example parseExpenseInput({ description: 'Gás', amount: 120 })
 */
export function parseExpenseInput(body: unknown): ExpenseInput {
  const fields = parseObject(body, 'gasto');
  return {
    description: parseText(
      fields.description,
      'description',
      MAX_DESCRIPTION_LENGTH,
    ),
    amount: parseMoney(fields.amount, 'amount', false),
  };
}
