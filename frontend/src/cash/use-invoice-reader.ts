import { useState } from 'react';
import { errorMessage } from '../api/error-message';
import type { InvoiceApi } from '../api/invoice-api';
import type { InvoicePreview } from '../api/invoice-types';
import type { Expense } from '../api/types';
import type { OutsideMarks } from '../purchases/outside-items';
import {
  initialInvoiceDraft,
  readInvoiceDraft,
  withOutsideMarks,
  withoutInvoice,
  type InvoiceDraft,
} from './expense-invoice-draft';

interface UseInvoiceReaderArgs {
  invoices: InvoiceApi;
  editing: Expense | null;
  /** Nota lida: o formulário se preenche com ela. */
  onRead(preview: InvoicePreview): void;
}

export interface InvoiceReaderState {
  code: string;
  setCode(code: string): void;
  draft: InvoiceDraft;
  error: string | null;
  reading: boolean;
  read(): Promise<void>;
  remove(): void;
  /** As marcas de fora novas na nota lida ou mantida (2026-10-25). */
  setOutside(marks: OutsideMarks): void;
  /** Depois de salvar: o próximo gasto começa sem nota. */
  reset(): void;
  /**
   * Link ou chave digitado e ainda não lido: avisa e devolve true (o gasto não sai sem a nota
   * que o caixa colou).
   */
  blockUnreadCode(): boolean;
}

/**
 * Campo "Nota fiscal" do gasto: lê o link ou a chave na SEFAZ (pela API) e guarda a nota lida,
 * a do gasto em edição ou a decisão de tirar a nota.
 *
 * @example const reader = useInvoiceReader({ invoices, editing, onRead: form.fillFromInvoice });
 */
export function useInvoiceReader(
  args: UseInvoiceReaderArgs,
): InvoiceReaderState {
  const { invoices, editing, onRead } = args;
  const [code, setCode] = useState('');
  const [draft, setDraft] = useState(() => initialInvoiceDraft(editing));
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const read = async () => {
    const typed = code.trim();
    if (!typed)
      return setError('Cole o link do QR Code ou digite a chave da nota');
    setReading(true);
    try {
      const preview = await invoices.preview(typed, editing?.id ?? null);
      setDraft(readInvoiceDraft(typed, preview));
      setCode('');
      setError(null);
      onRead(preview);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setReading(false);
    }
  };

  const reset = () => {
    setDraft({ kind: 'none' });
    setCode('');
    setError(null);
  };
  const remove = () => setDraft(withoutInvoice(editing));
  const setOutside = (marks: OutsideMarks) =>
    setDraft((current) => withOutsideMarks(current, marks));
  const blockUnreadCode = () => {
    if (!code.trim()) return false;
    setError(
      'Leia a nota antes de salvar o gasto (Enter no campo ou a tecla Ler), ou apague o link',
    );
    return true;
  };
  return {
    code,
    setCode,
    draft,
    error,
    reading,
    read,
    remove,
    setOutside,
    reset,
    blockUnreadCode,
  };
}
