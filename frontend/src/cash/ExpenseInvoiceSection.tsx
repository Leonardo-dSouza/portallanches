import { Receipt, ScanLine } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { formatMoney } from '../api/money';
import { TextField } from '../components/TextField';
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
import type { InvoiceReaderState } from './use-invoice-reader';

/**
 * Topo do formulário de gasto: o campo da nota (link colado, chave digitada ou o leitor USB,
 * que digita o link e o Enter) e o cartão da nota lida. O Enter aqui lê a nota em vez de
 * salvar o gasto.
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
  const readOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void reader.read();
  };
  return (
    <div className="invoice-reader">
      <div className="invoice-code-row">
        <TextField
          label="Nota fiscal (link ou chave)"
          value={reader.code}
          onChange={reader.setCode}
          onKeyDown={readOnEnter}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="button button-secondary"
          disabled={reader.reading}
          aria-busy={reader.reading}
          onClick={() => void reader.read()}
        >
          <ScanLine aria-hidden />
          Ler
        </button>
      </div>
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
