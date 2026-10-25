import { Check } from 'lucide-react';
import { formatMoney } from '../api/money';
import { InvoiceDialog } from './InvoiceDialog';
import { useSavedInvoice } from './use-saved-invoice';
import { useOutsideSave, type OutsideSaveState } from './use-outside-save';

interface EditableInvoiceDialogProps {
  invoiceId: number;
  /** Código do produto a destacar (a nota aberta pelo Histórico do produto). */
  highlightCode?: string;
  /** Marcas gravadas: a lista atrás (Notas, Preços) recarrega. */
  onSaved(): void;
  onClose(): void;
}

/**
 * A nota em Compras (2026-10-25): o admin marca o que não é da lanchonete e salva; o gasto
 * daquela noite é recalculado no servidor, mesmo com a noite fechada.
 *
 * @example <EditableInvoiceDialog invoiceId={12} onSaved={list.reload} onClose={close} />
 */
export function EditableInvoiceDialog({
  invoiceId,
  highlightCode,
  onSaved,
  onClose,
}: EditableInvoiceDialogProps) {
  const saved = useSavedInvoice(invoiceId);
  const outside = useOutsideSave(invoiceId, () => {
    saved.reload();
    onSaved();
  });
  return (
    <InvoiceDialog
      invoice={saved.invoice}
      error={saved.error ?? outside.error}
      highlightCode={highlightCode}
      marking={outside.marking}
      actions={saved.invoice && <SaveMarksAction outside={outside} />}
      onClose={onClose}
    />
  );
}

/** "Salvar marcação" e, depois de salvar, o valor novo do gasto da noite. */
function SaveMarksAction({ outside }: { outside: OutsideSaveState }) {
  return (
    <>
      {outside.saved && (
        <span className="invoice-saved" role="status">
          {`Salvo: gasto da noite ${formatMoney(outside.saved.expenseAmount)}`}
        </span>
      )}
      <button
        type="button"
        className="button button-secondary"
        disabled={!outside.dirty || outside.saving}
        aria-busy={outside.saving}
        onClick={() => void outside.save()}
      >
        <Check aria-hidden />
        Salvar marcação
      </button>
    </>
  );
}
