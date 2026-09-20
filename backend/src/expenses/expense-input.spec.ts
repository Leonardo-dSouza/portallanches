import { BadRequestException } from '@nestjs/common';
import { parseExpenseInput } from './expense-input.js';

describe('parseExpenseInput', () => {
  it('aceita gasto com tipo e apara a observação', () => {
    expect(
      parseExpenseInput({
        expenseTypeId: 3,
        description: '  João ',
        amount: 120,
      }),
    ).toEqual({ expenseTypeId: 3, description: 'João', amount: '120.00' });
  });

  it('observação é opcional e vira null', () => {
    expect(parseExpenseInput({ expenseTypeId: 1, amount: 10 })).toEqual({
      expenseTypeId: 1,
      description: null,
      amount: '10.00',
    });
  });

  it.each([
    null,
    { amount: 10 },
    { expenseTypeId: 0, amount: 10 },
    { expenseTypeId: '1', amount: 10 },
    { expenseTypeId: 1, description: '   ', amount: 10 },
    { expenseTypeId: 1, description: 'x'.repeat(201), amount: 10 },
    { expenseTypeId: 1, amount: 0 },
    { expenseTypeId: 1, amount: '1,5' },
  ])('rejeita %j', (body) => {
    expect(() => parseExpenseInput(body)).toThrow(BadRequestException);
  });

  it('cita o campo e o valor recebido no tipo inválido', () => {
    expect(() => parseExpenseInput({ expenseTypeId: 'x', amount: 10 })).toThrow(
      /"expenseTypeId".*"x"/,
    );
  });
});
