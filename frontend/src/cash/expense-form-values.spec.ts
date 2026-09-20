import type { Expense, ExpenseType } from '../api/types';
import {
  buildExpenseRequest,
  expenseFormValuesOf,
  type ExpenseFormValues,
} from './expense-form-values';

const TYPES: ExpenseType[] = [
  { id: 1, name: 'Gás', nameKey: 'gas', active: true },
  { id: 2, name: 'Velho', nameKey: 'velho', active: false },
];

const form = (overrides: Partial<ExpenseFormValues>): ExpenseFormValues => ({
  typeName: 'Gás',
  amount: '120',
  description: '',
  ...overrides,
});

describe('buildExpenseRequest', () => {
  it('tipo existente (sem acento/caixa) reaproveita o id e omite a observação vazia', () => {
    expect(buildExpenseRequest(form({ typeName: ' GAS ' }), TYPES)).toEqual({
      ok: true,
      request: { expenseTypeId: 1, newTypeName: null, amount: '120.00' },
    });
  });

  it('tipo desconhecido vira newTypeName e mantém a observação aparada', () => {
    expect(
      buildExpenseRequest(
        form({ typeName: ' Embalagens ', description: ' caixas ' }),
        TYPES,
      ),
    ).toEqual({
      ok: true,
      request: {
        expenseTypeId: null,
        newTypeName: 'Embalagens',
        amount: '120.00',
        description: 'caixas',
      },
    });
  });

  it.each([
    [{ typeName: '  ' }, /Informe o tipo/],
    [{ amount: '1.250,00' }, /Valor inválido "1.250,00"/],
    [{ typeName: 'velho' }, /"Velho" está inativo/],
  ])('rejeita %j', (overrides, message) => {
    expect(buildExpenseRequest(form(overrides), TYPES)).toMatchObject({
      ok: false,
      error: expect.stringMatching(message),
    });
  });
});

describe('expenseFormValuesOf', () => {
  it('preenche o formulário de um gasto existente com vírgula decimal', () => {
    const expense: Expense = {
      id: 4,
      expenseTypeId: 1,
      description: null,
      amount: '35.90',
    };
    expect(expenseFormValuesOf(expense, TYPES)).toEqual({
      typeName: 'Gás',
      amount: '35,90',
      description: '',
    });
  });
});
