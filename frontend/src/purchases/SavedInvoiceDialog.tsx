import { InvoiceDialog } from './InvoiceDialog';
import { useSavedInvoice } from './use-saved-invoice';
import type { OutsideMarking } from './use-outside-toggle';

interface SavedInvoiceDialogProps {
  invoiceId: number;
  /** Código do produto a destacar (a nota aberta pelo Histórico do produto). */
  highlightCode?: string;
  /** Marcar os itens de fora (o gasto em edição no Caixa); sem ela, só leitura. */
  marking?: OutsideMarking;
  onClose(): void;
}

/** Janela da nota de um gasto já salvo: busca a nota com os itens pelo id. */
export function SavedInvoiceDialog({
  invoiceId,
  highlightCode,
  marking,
  onClose,
}: SavedInvoiceDialogProps) {
  const { invoice, error } = useSavedInvoice(invoiceId);
  return (
    <InvoiceDialog
      invoice={invoice}
      error={error}
      highlightCode={highlightCode}
      marking={marking}
      onClose={onClose}
    />
  );
}
