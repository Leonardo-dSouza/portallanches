import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseInvoiceStockEntryInput } from './invoice-stock-entry-input.js';

describe('parseInvoiceStockEntryInput', () => {
  it('valida lista de itens com validade preenchida e nula', () => {
    const input = parseInvoiceStockEntryInput({
      items: [
        { itemId: 1, expiresOn: '2026-11-20' },
        { itemId: 2, expiresOn: null },
      ],
    });
    expect(input).toEqual([
      { itemId: 1, expiresOn: '2026-11-20' },
      { itemId: 2, expiresOn: null },
    ]);
  });

  it('aceita expiresOn omitido como null', () => {
    const input = parseInvoiceStockEntryInput({
      items: [{ itemId: 5 }],
    });
    expect(input).toEqual([{ itemId: 5, expiresOn: null }]);
  });

  it('rejeita corpo que não é objeto', () => {
    expect(() => parseInvoiceStockEntryInput('invalido')).toThrow(
      BadRequestException,
    );
  });

  it('rejeita items ausente ou vazio', () => {
    expect(() => parseInvoiceStockEntryInput({})).toThrow(BadRequestException);
    expect(() => parseInvoiceStockEntryInput({ items: [] })).toThrow(
      BadRequestException,
    );
  });

  it('rejeita item repetido na lista', () => {
    expect(() =>
      parseInvoiceStockEntryInput({
        items: [{ itemId: 1 }, { itemId: 1 }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita itemId inválido', () => {
    expect(() =>
      parseInvoiceStockEntryInput({
        items: [{ itemId: 0 }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita expiresOn em formato inválido', () => {
    expect(() =>
      parseInvoiceStockEntryInput({
        items: [{ itemId: 1, expiresOn: '20-11-2026' }],
      }),
    ).toThrow(BadRequestException);
  });
});
