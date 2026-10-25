import { UnprocessableEntityException } from '@nestjs/common';
import { rebalancedExpenseAmount } from './expense-rebalance.js';
import type { OutsideSnapshot } from './purchase-records.js';

const snapshot = (
  expenseAmount: string,
  outside: number[] = [],
): OutsideSnapshot => ({
  invoiceId: 12,
  expenseId: 448,
  expenseAmount,
  items: [
    { position: 1, total: '24.83', outsideBusiness: outside.includes(1) },
    { position: 2, total: '4.89', outsideBusiness: outside.includes(2) },
    { position: 3, total: '4.89', outsideBusiness: outside.includes(3) },
  ],
});

describe('rebalancedExpenseAmount', () => {
  it('marcar desconta o total das linhas', () => {
    expect(rebalancedExpenseAmount(snapshot('34.61'), [2, 3])).toBe('24.83');
  });

  it('desmarcar devolve; trocar faz as duas coisas', () => {
    expect(rebalancedExpenseAmount(snapshot('24.83', [2, 3]), [])).toBe(
      '34.61',
    );
    expect(rebalancedExpenseAmount(snapshot('29.72', [2]), [3])).toBe('29.72');
  });

  it('preserva o ajuste feito à mão no Caixa (mexe só pela diferença)', () => {
    // Lançado 30,00 (arredondado pelo caixa) com a nota de 34,61.
    expect(rebalancedExpenseAmount(snapshot('30.00'), [2])).toBe('25.11');
  });

  it('gasto zerado ou negativo é 422 com os valores', () => {
    expect(() => rebalancedExpenseAmount(snapshot('5.00'), [1])).toThrow(
      UnprocessableEntityException,
    );
    expect(() => rebalancedExpenseAmount(snapshot('5.00'), [1])).toThrow(
      'O gasto #448 ficaria com R$ -19.83 (lançado R$ 5.00, itens de fora R$ 24.83)',
    );
  });
});
