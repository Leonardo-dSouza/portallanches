import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { errorMessage } from '../api/error-message';
import { createInvoiceApi } from '../api/invoice-api';
import type { ExpenseInvoiceDetail } from '../api/invoice-types';
import { InvoiceDialog } from './InvoiceDialog';

function useSavedInvoice(invoiceId: number) {
  const api = useApi();
  const invoices = useMemo(() => createInvoiceApi(api), [api]);
  const [invoice, setInvoice] = useState<ExpenseInvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    invoices.detail(invoiceId).then(
      (read) => current && setInvoice(read),
      (failure) => current && setError(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [invoices, invoiceId]);
  return { invoice, error };
}

interface SavedInvoiceDialogProps {
  invoiceId: number;
  /** Código do produto a destacar (a nota aberta pelo Histórico do produto). */
  highlightCode?: string;
  onClose(): void;
}

/** Janela da nota de um gasto já salvo: busca a nota com os itens pelo id. */
export function SavedInvoiceDialog({
  invoiceId,
  highlightCode,
  onClose,
}: SavedInvoiceDialogProps) {
  const { invoice, error } = useSavedInvoice(invoiceId);
  return (
    <InvoiceDialog
      invoice={invoice}
      error={error}
      highlightCode={highlightCode}
      onClose={onClose}
    />
  );
}
