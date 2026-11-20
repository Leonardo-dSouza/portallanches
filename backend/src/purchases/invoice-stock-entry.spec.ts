import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  INVOICE_STOCK_START,
  type LinkedInvoiceItem,
  planInvoiceStockEntry,
} from './invoice-stock-entry.js';

describe('invoice-stock-entry', () => {
  it('define INVOICE_STOCK_START como 2026-11-14', () => {
    expect(INVOICE_STOCK_START).toBe('2026-11-14');
  });

  it('2 caixas de hambúrguer a 44,89 ligadas a base 36 viram 72 un com custo 1.2469', () => {
    const items: LinkedInvoiceItem[] = [
      {
        id: 10,
        invoiceId: 100,
        quantity: '2',
        unitPrice: '44.89',
        outsideBusiness: false,
        link: { supplyId: 5, baseQuantity: '36', deductOnSale: true },
      },
    ];

    const lots = planInvoiceStockEntry(
      items,
      [{ itemId: 10, expiresOn: '2026-12-01' }],
      1,
    );

    expect(lots).toEqual([
      {
        supplyId: 5,
        quantity: '72',
        expiresOn: '2026-12-01',
        createdById: 1,
        unitCost: '1.2469',
        invoiceItemId: 10,
      },
    ]);
  });

  it('Bacon 1,302 KG a 36,50 ligado ao Bacon (kg, 1) vira lote 1.302 com custo 36.5', () => {
    const items: LinkedInvoiceItem[] = [
      {
        id: 20,
        invoiceId: 100,
        quantity: '1.302',
        unitPrice: '36.50',
        outsideBusiness: false,
        link: { supplyId: 8, baseQuantity: '1', deductOnSale: true },
      },
    ];

    const lots = planInvoiceStockEntry(
      items,
      [{ itemId: 20, expiresOn: null }],
      2,
    );

    expect(lots).toEqual([
      {
        supplyId: 8,
        quantity: '1.302',
        expiresOn: null,
        createdById: 2,
        unitCost: '36.5',
        invoiceItemId: 20,
      },
    ]);
  });

  it('rejeita item sem ligação com 422 e o id', () => {
    const items: LinkedInvoiceItem[] = [
      {
        id: 30,
        invoiceId: 100,
        quantity: '1',
        unitPrice: '10.00',
        outsideBusiness: false,
        link: null,
      },
    ];

    expect(() =>
      planInvoiceStockEntry(items, [{ itemId: 30, expiresOn: null }], 1),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      planInvoiceStockEntry(items, [{ itemId: 30, expiresOn: null }], 1),
    ).toThrow('30');
  });

  it('rejeita item fora da lanchonete com 422 e o id', () => {
    const items: LinkedInvoiceItem[] = [
      {
        id: 40,
        invoiceId: 100,
        quantity: '1',
        unitPrice: '10.00',
        outsideBusiness: true,
        link: { supplyId: 5, baseQuantity: '1', deductOnSale: true },
      },
    ];

    expect(() =>
      planInvoiceStockEntry(items, [{ itemId: 40, expiresOn: null }], 1),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      planInvoiceStockEntry(items, [{ itemId: 40, expiresOn: null }], 1),
    ).toThrow('40');
  });

  it('rejeita item de insumo sem baixa na venda com 422, o id e o insumo', () => {
    const items: LinkedInvoiceItem[] = [
      {
        id: 60,
        invoiceId: 100,
        quantity: '2',
        unitPrice: '9.27',
        outsideBusiness: false,
        link: { supplyId: 128, baseQuantity: '0.27', deductOnSale: false },
      },
    ];

    const enter = () =>
      planInvoiceStockEntry(items, [{ itemId: 60, expiresOn: null }], 1);

    expect(enter).toThrow(UnprocessableEntityException);
    expect(enter).toThrow(/Item 60.*insumo 128.*baixa na venda/);
  });

  it('rejeita item que não pertence à nota com 422 e o id', () => {
    const items: LinkedInvoiceItem[] = [
      {
        id: 50,
        invoiceId: 100,
        quantity: '1',
        unitPrice: '10.00',
        outsideBusiness: false,
        link: { supplyId: 5, baseQuantity: '1', deductOnSale: true },
      },
    ];

    expect(() =>
      planInvoiceStockEntry(items, [{ itemId: 999, expiresOn: null }], 1),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      planInvoiceStockEntry(items, [{ itemId: 999, expiresOn: null }], 1),
    ).toThrow('999');
  });
});
