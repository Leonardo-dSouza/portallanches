import { BadRequestException } from '@nestjs/common';
import { parseExpenseInput } from './expense-input.js';

describe('parseExpenseInput', () => {
  it('aceita gasto válido e apara espaços da descrição', () => {
    expect(parseExpenseInput({ description: '  Gás ', amount: 120 })).toEqual({
      description: 'Gás',
      amount: '120.00',
    });
  });

  it.each([
    null,
    { amount: 10 },
    { description: '   ', amount: 10 },
    { description: 'x'.repeat(201), amount: 10 },
    { description: 'Gás', amount: 0 },
    { description: 'Gás', amount: '1,5' },
  ])('rejeita %j', (body) => {
    expect(() => parseExpenseInput(body)).toThrow(BadRequestException);
  });

  it('cita o campo e o valor recebido na descrição inválida', () => {
    expect(() => parseExpenseInput({ description: 5, amount: 10 })).toThrow(
      /"description".*5/,
    );
  });
});
