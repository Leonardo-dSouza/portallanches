import { BadRequestException } from '@nestjs/common';
import {
  parseExpenseInput,
  parseInvoicePreviewInput,
} from './expense-input.js';

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

  describe('invoiceCode (nota fiscal)', () => {
    const base = { expenseTypeId: 1, amount: 10 };

    it('ausente = manter a nota como está', () => {
      expect(parseExpenseInput(base).invoiceCode).toBeUndefined();
    });

    it('null = tirar a nota', () => {
      expect(
        parseExpenseInput({ ...base, invoiceCode: null }).invoiceCode,
      ).toBeNull();
    });

    it('texto = ler e prender, aparado', () => {
      const body = { ...base, invoiceCode: '  https://x/qrcode?p=1 ' };
      expect(parseExpenseInput(body).invoiceCode).toBe('https://x/qrcode?p=1');
    });

    it.each(['   ', 42, 'x'.repeat(501)])('rejeita %j', (invoiceCode) => {
      expect(() => parseExpenseInput({ ...base, invoiceCode })).toThrow(
        /"invoiceCode"/,
      );
    });
  });

  describe('nota importada pelo HTML', () => {
    const base = { expenseTypeId: 1, amount: 10, invoiceCode: 'KEY' };

    it('ausente fica undefined; presente vem junto do código', () => {
      expect(parseExpenseInput(base).invoicePage).toBeUndefined();
      expect(
        parseExpenseInput({ ...base, invoicePage: '<html>' }).invoicePage,
      ).toBe('<html>');
    });

    it('rejeita o HTML sem o código da nota', () => {
      expect(() =>
        parseExpenseInput({
          expenseTypeId: 1,
          amount: 10,
          invoicePage: '<html>',
        }),
      ).toThrow(/"invoicePage".*"invoiceCode"/);
    });

    it('acima de 2 MB rejeita dizendo o tamanho, sem repetir o HTML (traz CPF)', () => {
      const invoicePage = `CPF${'x'.repeat(2_000_000)}`;
      const parse = () => parseExpenseInput({ ...base, invoicePage });
      expect(parse).toThrow(/2000003 caracteres/);
      expect(parse).not.toThrow(/CPF/);
    });

    it.each([42, '', '   '])('rejeita %j', (invoicePage) => {
      expect(() => parseExpenseInput({ ...base, invoicePage })).toThrow(
        /"invoicePage"/,
      );
    });
  });

  describe('itens fora da lanchonete (2026-10-25)', () => {
    const base = { expenseTypeId: 1, amount: 10 };

    it('ausente mantém as marcas; lista (até vazia) troca', () => {
      expect(parseExpenseInput(base).outsidePositions).toBeUndefined();
      expect(
        parseExpenseInput({ ...base, outsidePositions: [] }).outsidePositions,
      ).toEqual([]);
      expect(
        parseExpenseInput({ ...base, outsidePositions: [2, 5] })
          .outsidePositions,
      ).toEqual([2, 5]);
    });

    it.each([null, '2', [0], [1.5], ['2']])('rejeita %j', (positions) => {
      expect(() =>
        parseExpenseInput({ ...base, outsidePositions: positions }),
      ).toThrow(/outsidePositions/);
    });

    it('rejeita posição repetida dizendo qual', () => {
      expect(() =>
        parseExpenseInput({ ...base, outsidePositions: [2, 3, 2] }),
      ).toThrow('Campo "outsidePositions" com a posição 2 repetida');
    });
  });
});

describe('parseInvoicePreviewInput', () => {
  it('lê o código e o gasto que está sendo editado', () => {
    expect(parseInvoicePreviewInput({ code: ' 3526 ', expenseId: 7 })).toEqual({
      source: { kind: 'code', code: '3526' },
      expenseId: 7,
    });
  });

  it('lê o HTML salvo no lugar do código', () => {
    expect(parseInvoicePreviewInput({ savedPage: '<html>' })).toEqual({
      source: { kind: 'page', html: '<html>', expectedCode: null },
      expenseId: null,
    });
  });

  it('rejeita código e HTML juntos', () => {
    expect(() =>
      parseInvoicePreviewInput({ code: '3526', savedPage: '<html>' }),
    ).toThrow(/um dos dois/);
  });

  it('sem gasto em edição, expenseId fica null', () => {
    expect(parseInvoicePreviewInput({ code: '3526' }).expenseId).toBeNull();
  });

  it('rejeita sem código', () => {
    expect(() => parseInvoicePreviewInput({})).toThrow(/"code"/);
  });
});
