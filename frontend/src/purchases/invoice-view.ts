import type { InvoicePreview, InvoiceView } from '../api/invoice-types';

/**
 * Nota lida na prévia, no formato da janela "Ver itens" (ainda sem valor lançado).
 *
 * @example invoiceViewOfPreview(preview).expenseAmount // null
 */
export function invoiceViewOfPreview(preview: InvoicePreview): InvoiceView {
  const { issuerName, ...invoice } = preview.invoice;
  return {
    ...invoice,
    vendorName: preview.vendorName,
    legalName: issuerName,
    expenseAmount: null,
  };
}
