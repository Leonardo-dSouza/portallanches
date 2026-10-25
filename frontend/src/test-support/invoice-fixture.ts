import type {
  ExpenseInvoiceDetail,
  ExpenseInvoiceSummary,
  InvoicePreview,
} from '../api/invoice-types';

// Nota sintética (o repositório é público): mercado e chave de exemplo.
export const INVOICE_KEY = '35261011222333000181650010000012341123456780';
export const INVOICE_LINK = `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${INVOICE_KEY}|2|1|1|ABC123`;

export const INVOICE_PREVIEW: InvoicePreview = {
  vendorName: 'Exemplo',
  suggestion: null,
  outsidePositions: [],
  invoice: {
    accessKey: INVOICE_KEY,
    issuerName: 'MERCADO EXEMPLO LTDA',
    issuerCnpj: '11222333000181',
    number: 25767,
    series: 12,
    issuedAt: '2026-09-22T20:14:11.000Z',
    itemsTotal: '66.71',
    discount: '1.80',
    amountDue: '64.91',
    paymentLabel: 'Cartão de Crédito',
    items: [
      {
        position: 1,
        code: '1128810',
        description: 'BACON EXEMPLO kg',
        quantity: '1.248',
        unit: 'Kg',
        unitPrice: '19.9',
        total: '24.83',
      },
      {
        position: 2,
        code: '7890000000017',
        description: 'REF COLA 350ML',
        quantity: '12',
        unit: 'UN',
        unitPrice: '3.49',
        total: '41.88',
      },
    ],
  },
};

/** Resumo da nota de exemplo como vem na lista de gastos. */
export function invoiceSummaryOf(id: number): ExpenseInvoiceSummary {
  const { invoice, vendorName } = INVOICE_PREVIEW;
  return {
    id,
    vendorName,
    issuedAt: invoice.issuedAt,
    itemCount: invoice.items.length,
    outsideItemCount: 0,
    outsideTotal: '0.00',
    amountDue: invoice.amountDue,
  };
}

/** Nota de exemplo presa ao gasto `expenseId`, lançado com `expenseAmount`. */
export function invoiceDetailOf(
  id: number,
  expenseId: number,
  expenseAmount: string,
): ExpenseInvoiceDetail {
  const { issuerName, ...invoice } = INVOICE_PREVIEW.invoice;
  return {
    ...invoice,
    id,
    vendorName: INVOICE_PREVIEW.vendorName,
    legalName: issuerName,
    expenseId,
    expenseAmount,
    closingId: 10,
  };
}
