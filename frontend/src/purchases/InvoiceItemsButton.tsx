import { Receipt } from 'lucide-react';
import { useState } from 'react';
import type { ExpenseInvoiceSummary } from '../api/invoice-types';
import { invoiceItemsLabel } from './invoice-format';
import { SavedInvoiceDialog } from './SavedInvoiceDialog';

/**
 * Selo do gasto lançado pela nota ("20 itens"): abre a nota com os itens. Fica na lista de
 * gastos do Caixa e da Análise do dia.
 */
export function InvoiceItemsButton({
  invoice,
}: {
  invoice: ExpenseInvoiceSummary;
}) {
  const [open, setOpen] = useState(false);
  const count = invoiceItemsLabel(invoice.itemCount, invoice.outsideItemCount);
  return (
    <>
      <button
        type="button"
        className="invoice-chip"
        aria-label={`Ver ${count} da nota`}
        onClick={() => setOpen(true)}
      >
        <Receipt aria-hidden />
        {count}
      </button>
      {open && (
        <SavedInvoiceDialog
          invoiceId={invoice.id}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
