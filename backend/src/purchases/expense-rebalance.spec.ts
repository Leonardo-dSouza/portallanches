import { UnprocessableEntityException } from '@nestjs/common';
import { rebalancedExpenseAmount } from './expense-rebalance.js';
import type { OutsideSnapshot } from './purchase-records.js';

const snapshot = (
  expenseAmount: string,
  outside: number[] = [],
  discount = '0.00',
  businessDiscount = discount,
): OutsideSnapshot => ({
  invoiceId: 12,
  expenseId: 448,
  expenseAmount,
  discount,
  businessDiscount,
  items: [
    { position: 1, total: '24.83', outsideBusiness: outside.includes(1) },
    { position: 2, total: '4.89', outsideBusiness: outside.includes(2) },
    { position: 3, total: '4.89', outsideBusiness: outside.includes(3) },
  ],
});

/** Exemplo real do contrato: a pagar 43,14, desconto 7,19, torresmo 28,56. */
const realSnapshot = (
  expenseAmount: string,
  outside: number[] = [],
  businessDiscount = '7.19',
): OutsideSnapshot => ({
  invoiceId: 20,
  expenseId: 500,
  expenseAmount,
  discount: '7.19',
  businessDiscount,
  items: [
    { position: 1, total: '28.56', outsideBusiness: outside.includes(1) },
    { position: 2, total: '21.77', outsideBusiness: outside.includes(2) },
  ],
});

describe('rebalancedExpenseAmount', () => {
  it('marcar desconta o total das linhas quando não há desconto', () => {
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

  describe('com desconto e itens de fora (exemplo real, 2026-11-08)', () => {
    it('ponta 1: desconto da lanchonete zero desconta do item de fora (fora 21,37, lanchonete 21,77)', () => {
      expect(rebalancedExpenseAmount(realSnapshot('43.14'), [1], '0.00')).toBe(
        '21.77',
      );
    });

    it('ponta 2: desconto da lanchonete inteiro mantém o comportamento de hoje (fora 28,56, lanchonete 14,58)', () => {
      expect(rebalancedExpenseAmount(realSnapshot('43.14'), [1], '7.19')).toBe(
        '14.58',
      );
    });

    it('valor no meio: desconto da lanchonete de R$ 3,00 reparte (fora 24,37, lanchonete 18,77)', () => {
      expect(rebalancedExpenseAmount(realSnapshot('43.14'), [1], '3.00')).toBe(
        '18.77',
      );
    });

    it('rebalanceia a partir de nota já marcada com desconto diferente', () => {
      // Já estava com fora 28,56 (gasto 14,58) e desconto 7,19; muda desconto para 0 (gasto sobe para 21,77)
      expect(
        rebalancedExpenseAmount(
          realSnapshot('14.58', [1], '7.19'),
          [1],
          '0.00',
        ),
      ).toBe('21.77');
      // Já estava com fora 21,37 (gasto 21,77) e desconto 0; desmarca todos (gasto volta a 43,14)
      expect(
        rebalancedExpenseAmount(realSnapshot('21.77', [1], '0.00'), []),
      ).toBe('43.14');
    });
  });
});
