import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ExpenseInvoiceDetail } from '../api/invoice-types';
import { formatMoney } from '../api/money';
import type { PurchaseInvoiceRow } from '../api/purchase-types';
import { InvoiceDialog } from './InvoiceDialog';
import type { InvoiceItemGroup } from './invoice-item-groups';
import { LinkSupplyDialog } from './LinkSupplyDialog';
import { useOutsideSave, type OutsideSaveState } from './use-outside-save';
import { useSavedInvoice } from './use-saved-invoice';

interface EditableInvoiceDialogProps {
  invoiceId: number;
  purchaseInvoice?: PurchaseInvoiceRow;
  /** Código do produto a destacar (a nota aberta pelo Histórico do produto). */
  highlightCode?: string;
  /** Marcas gravadas: a lista atrás (Notas, Preços) recarrega. */
  onSaved(): void;
  onClose(): void;
}

function mergeInvoiceAlerts(
  invoice: ExpenseInvoiceDetail | null,
  purchaseInvoice?: PurchaseInvoiceRow,
): ExpenseInvoiceDetail | null {
  if (!invoice || !purchaseInvoice?.items) return invoice;
  const itemsByPosition = new Map(
    purchaseInvoice.items.map((it) => [it.position, it]),
  );
  return {
    ...invoice,
    items: invoice.items.map((item) => {
      const matched = itemsByPosition.get(item.position);
      if (!matched) return item;
      return {
        ...item,
        link: matched.link,
        alert: matched.alert,
      };
    }),
  };
}

/**
 * A nota em Compras (2026-10-25): o admin marca o que não é da lanchonete e salva; o gasto
 * daquela noite é recalculado no servidor, mesmo com a noite fechada.
 *
 * @example <EditableInvoiceDialog invoiceId={12} onSaved={list.reload} onClose={close} />
 */
export function EditableInvoiceDialog({
  invoiceId,
  purchaseInvoice,
  highlightCode,
  onSaved,
  onClose,
}: EditableInvoiceDialogProps) {
  const saved = useSavedInvoice(invoiceId);
  const outside = useOutsideSave(
    invoiceId,
    () => {
      saved.reload();
      onSaved();
    },
    saved.invoice?.discount,
    saved.invoice?.businessDiscount,
  );
  const [linkingItem, setLinkingItem] = useState<InvoiceItemGroup | null>(null);
  const vendorId = purchaseInvoice?.vendorId;
  const invoice = useMemo(
    () => mergeInvoiceAlerts(saved.invoice, purchaseInvoice),
    [saved.invoice, purchaseInvoice],
  );

  return (
    <>
      <InvoiceDialog
        invoice={invoice}
        error={saved.error ?? outside.error}
        highlightCode={highlightCode}
        marking={outside.marking}
        actions={saved.invoice && <SaveMarksAction outside={outside} />}
        onLink={vendorId ? (itemGroup) => setLinkingItem(itemGroup) : undefined}
        onClose={onClose}
      />
      {linkingItem !== null && vendorId && (
        <LinkSupplyDialog
          vendorId={vendorId}
          item={{
            code: linkingItem.code,
            description: linkingItem.description,
            link: linkingItem.link,
          }}
          onSaved={() => {
            saved.reload();
            onSaved();
          }}
          onClose={() => setLinkingItem(null)}
        />
      )}
    </>
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
        disabled={!outside.dirty || outside.saving || Boolean(outside.problem)}
        aria-busy={outside.saving}
        onClick={() => void outside.save()}
      >
        <Check aria-hidden />
        Salvar marcação
      </button>
    </>
  );
}
