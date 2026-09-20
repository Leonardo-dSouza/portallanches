import { parseId, parseObject, parseText } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';

const MAX_DESCRIPTION_LENGTH = 200;

/** Corpo de gasto já validado. */
export interface ExpenseInput {
  expenseTypeId: number;
  /** Observação opcional (ex.: nome do freelancer); null quando ausente. */
  description: string | null;
  amount: string;
}

const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null;

/**
 * Valida o corpo de um gasto vindo da API.
 *
 * @example parseExpenseInput({ expenseTypeId: 1, amount: 120 })
 */
export function parseExpenseInput(body: unknown): ExpenseInput {
  const fields = parseObject(body, 'gasto');
  return {
    expenseTypeId: parseId(fields.expenseTypeId, 'expenseTypeId'),
    description: isAbsent(fields.description)
      ? null
      : parseText(fields.description, 'description', MAX_DESCRIPTION_LENGTH),
    amount: parseMoney(fields.amount, 'amount', false),
  };
}
