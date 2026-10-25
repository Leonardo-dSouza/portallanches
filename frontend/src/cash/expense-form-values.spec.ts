import type { Expense, ExpenseType } from '../api/types';
import {
  shiftedAmount,
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
      invoice: null,
    };
    expect(expenseFormValuesOf(expense, TYPES)).toEqual({
      typeName: 'Gás',
      amount: '35,90',
      description: '',
    });
  });
});

describe('shiftedAmount (itens fora da lanchonete, 2026-10-25)', () => {
  it('tira e devolve o total do item, preservando o ajuste do caixa', () => {
    expect(shiftedAmount('447,26', -1467)).toBe('432,59');
    expect(shiftedAmount('432,59', 1467)).toBe('447,26');
    expect(shiftedAmount('300', -489)).toBe('295,11');
  });

  it('Valor ilegível ou que ficaria zerado fica como está', () => {
    expect(shiftedAmount('', -489)).toBe('');
    expect(shiftedAmount('abc', -489)).toBe('abc');
    expect(shiftedAmount('4,89', -489)).toBe('4,89');
  });
});
