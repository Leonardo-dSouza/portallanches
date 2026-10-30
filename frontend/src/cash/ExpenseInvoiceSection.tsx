import { FileUp, Receipt } from 'lucide-react';
import { useState } from 'react';
import { formatMoney } from '../api/money';
import { InvoiceDialog } from '../purchases/InvoiceDialog';
import { formatIssuedAt, invoiceItemsLabel } from '../purchases/invoice-format';
import { invoiceViewOfPreview } from '../purchases/invoice-view';
import type { OutsideMarks } from '../purchases/outside-items';
import { SavedInvoiceDialog } from '../purchases/SavedInvoiceDialog';
import {
  invoiceCardOf,
  type InvoiceCard,
  type InvoiceDraft,
} from './expense-invoice-draft';
import { InvoiceImportOptions } from './InvoiceImportOptions';
import type { InvoiceReaderState } from './use-invoice-reader';

/**
 * Topo do formulário de gasto: a tecla "Importar nota fiscal" abre as opções (2026-10-30: o
 * campo fixo ocupava o formulário em todo gasto, e a maioria não tem nota). Com a nota lida ou
 * a do gasto em edição, fica só o canhoto.
 */
export function ExpenseInvoiceSection({
  reader,
  onOutsideChange,
}: {
  reader: InvoiceReaderState;
  /** Itens marcados ou desmarcados como fora da lanchonete (o Valor acompanha). */
  onOutsideChange(marks: OutsideMarks): void;
}) {
  const card = invoiceCardOf(reader.draft);
  return (
    <div className="invoice-reader">
      {!card && !reader.importing && (
        <button
          type="button"
          className="button button-secondary invoice-import-key"
          onClick={reader.openImport}
        >
          <FileUp aria-hidden />
          Importar nota fiscal
        </button>
      )}
      {!card && reader.importing && <InvoiceImportOptions reader={reader} />}
      {reader.error && (
        <p className="form-error" role="alert">
          {reader.error}
        </p>
      )}
      {card && (
        <InvoiceStub
          card={card}
          draft={reader.draft}
          onRemove={reader.remove}
          onOutsideChange={onOutsideChange}
        />
      )}
    </div>
  );
}

function stubDetails(card: InvoiceCard): string {
  const items = invoiceItemsLabel(card.itemCount, card.outsideCount);
  const issued = formatIssuedAt(card.issuedAt);
  return card.number === null
    ? `${issued}, ${items}`
    : `Nota ${card.number}, ${issued}, ${items}`;
}

interface InvoiceStubProps {
  card: InvoiceCard;
  draft: InvoiceDraft;
  onRemove(): void;
  onOutsideChange(marks: OutsideMarks): void;
}

/** Canhoto da nota no formulário: mercado, emissão, itens e o "a pagar". */
function InvoiceStub({
  card,
  draft,
  onRemove,
  onOutsideChange,
}: InvoiceStubProps) {
  const [viewing, setViewing] = useState(false);
  return (
    <div className="invoice-stub" role="group" aria-label="Nota fiscal lida">
      <Receipt aria-hidden className="invoice-stub-icon" />
      <p className="invoice-stub-main">
        <strong>{card.vendorName}</strong>
        <span>{stubDetails(card)}</span>
      </p>
      <strong className="invoice-stub-due">
        {formatMoney(card.amountDue)}
      </strong>
      <div className="invoice-stub-actions">
        <button
          type="button"
          className="button button-secondary button-sm"
          onClick={() => setViewing(true)}
        >
          Ver itens
        </button>
        <button
          type="button"
          className="button-ghost button-sm button-danger"
          onClick={onRemove}
        >
          Tirar nota
        </button>
      </div>
      {viewing && (
        <DraftInvoiceDialog
          draft={draft}
          onOutsideChange={onOutsideChange}
          onClose={() => setViewing(false)}
        />
      )}
    </div>
  );
}

interface DraftInvoiceDialogProps {
  draft: InvoiceDraft;
  onOutsideChange(marks: OutsideMarks): void;
  onClose(): void;
}

/**
 * A nota lida agora vem da prévia; a do gasto em edição, do servidor. As duas abrem para marcar
 * o que é de fora (2026-10-25); na do servidor, até mexer, valem as marcas gravadas.
 */
function DraftInvoiceDialog({
  draft,
  onOutsideChange,
  onClose,
}: DraftInvoiceDialogProps) {
  if (draft.kind === 'kept')
    return (
      <SavedInvoiceDialog
        invoiceId={draft.summary.id}
        marking={{
          positions: draft.outside?.positions ?? null,
          onChange: onOutsideChange,
        }}
        onClose={onClose}
      />
    );
  if (draft.kind !== 'read') return null;
  return (
    <InvoiceDialog
      invoice={invoiceViewOfPreview(draft.preview)}
      error={null}
      marking={{
        positions: draft.outside.positions,
        onChange: onOutsideChange,
      }}
      onClose={onClose}
    />
  );
}
