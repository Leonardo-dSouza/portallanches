import { toApiMoney } from '../api/money';
import type { Expense, ExpenseType } from '../api/types';
import { toNeighborhoodKey } from './neighborhood-key';
import { typedMoney } from './order-form-values';

/** Campos do formulário de gasto como o caixa os digita. */
export interface ExpenseFormValues {
  typeName: string;
  amount: string;
  description: string;
}

/** Tipo existente (`expenseTypeId`) ou tipo novo a cadastrar (`newTypeName`); nunca os dois. */
export interface ExpenseRequest {
  expenseTypeId: number | null;
  newTypeName: string | null;
  amount: string;
  description?: string;
}

export type BuildExpenseResult =
  { ok: true; request: ExpenseRequest } | { ok: false; error: string };

export const EMPTY_EXPENSE_FORM: ExpenseFormValues = {
  typeName: '',
  amount: '',
  description: '',
};

const fail = (error: string): BuildExpenseResult => ({ ok: false, error });

export function findExpenseType(types: ExpenseType[], typed: string) {
  const key = toNeighborhoodKey(typed);
  return types.find((type) => type.nameKey === key);
}

/** Preenche o formulário com um gasto existente, para edição. */
export function expenseFormValuesOf(
  expense: Expense,
  types: ExpenseType[],
): ExpenseFormValues {
  const type = types.find((t) => t.id === expense.expenseTypeId);
  return {
    typeName: type?.name ?? '',
    amount: typedMoney(expense.amount),
    description: expense.description ?? '',
  };
}

/**
 * Valida o formulário de gasto. Nome de tipo desconhecido vira `newTypeName`
 * (o tipo é criado na hora, como o bairro no pedido).
 *
 * @example buildExpenseRequest({ typeName: 'Gás', amount: '120', description: '' }, types)
 */
export function buildExpenseRequest(
  values: ExpenseFormValues,
  types: ExpenseType[],
): BuildExpenseResult {
  const typeName = values.typeName.trim();
  if (!typeName) return fail('Informe o tipo do gasto');
  const amount = toApiMoney(values.amount);
  if (amount === null)
    return fail(
      `Valor inválido "${values.amount}": digite só números, com vírgula para os centavos (ex.: 120,00)`,
    );
  const type = findExpenseType(types, typeName);
  if (type && !type.active) return fail(`O tipo "${type.name}" está inativo`);
  const description = values.description.trim();
  const request: ExpenseRequest = {
    expenseTypeId: type?.id ?? null,
    newTypeName: type ? null : typeName,
    amount,
    ...(description ? { description } : {}),
  };
  return { ok: true, request };
}
