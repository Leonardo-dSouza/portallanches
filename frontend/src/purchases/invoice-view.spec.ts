import { INVOICE_PREVIEW } from '../test-support/invoice-fixture';
import { invoiceViewOfPreview } from './invoice-view';

describe('invoiceViewOfPreview', () => {
  it('a prévia vira a nota da janela, com a razão social à parte e sem valor lançado', () => {
    expect(invoiceViewOfPreview(INVOICE_PREVIEW)).toEqual({
      accessKey: INVOICE_PREVIEW.invoice.accessKey,
      vendorName: 'Exemplo',
      legalName: 'MERCADO EXEMPLO LTDA',
      issuerCnpj: '11222333000181',
      number: 25767,
      series: 12,
      issuedAt: '2026-09-22T20:14:11.000Z',
      itemsTotal: '66.71',
      discount: '1.80',
      amountDue: '64.91',
      paymentLabel: 'Cartão de Crédito',
      items: INVOICE_PREVIEW.invoice.items,
      expenseAmount: null,
    });
  });
});
