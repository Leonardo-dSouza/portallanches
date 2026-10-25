import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { errorMessage } from '../api/error-message';
import { createInvoiceApi } from '../api/invoice-api';
import type { ExpenseInvoiceDetail } from '../api/invoice-types';

export interface SavedInvoiceState {
  invoice: ExpenseInvoiceDetail | null;
  error: string | null;
  /** Lê a nota de novo (depois de marcar os itens de fora em Compras). */
  reload(): void;
}

/** A nota de um gasto salvo, pelo id; `reload` mantém a nota na tela enquanto relê. */
export function useSavedInvoice(invoiceId: number): SavedInvoiceState {
  const api = useApi();
  const invoices = useMemo(() => createInvoiceApi(api), [api]);
  const [invoice, setInvoice] = useState<ExpenseInvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    invoices.detail(invoiceId).then(
      (read) => current && setInvoice(read),
      (failure) => current && setError(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [invoices, invoiceId, attempt]);
  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { invoice, error, reload };
}
