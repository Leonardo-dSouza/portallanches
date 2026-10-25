import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import type { InvoiceView } from '../api/invoice-types';
import { centsToMoney, formatMoney } from '../api/money';
import { Dialog } from '../components/Dialog';
import { formatCnpj, formatIssuedAt, sefazInvoiceUrl } from './invoice-format';
import { InvoiceItemsTable } from './InvoiceItemsTable';
import {
  businessAmountOf,
  outsideMarksOf,
  savedOutsidePositions,
  type OutsideMarks,
} from './outside-items';
import { useOutsideToggle, type OutsideMarking } from './use-outside-toggle';

interface InvoiceDialogProps {
  /** null enquanto a nota carrega. */
  invoice: InvoiceView | null;
  error: string | null;
  /** Código do produto cuja linha fica destacada (vindo do Histórico do produto). */
  highlightCode?: string;
  /** Com ela, cada item ganha a caixinha "Fora"; sem ela, a nota é só para ler. */
  marking?: OutsideMarking;
  /** Teclas a mais no rodapé, antes do "Fechar" (o "Salvar marcação" de Compras). */
  actions?: ReactNode;
  onClose(): void;
}

/**
 * A nota fiscal como no cupom: mercado, emissão, itens em colunas e os totais. Usada no Caixa
 * (antes e depois de salvar o gasto), na Análise do dia e em Compras. Os itens fora da
 * lanchonete (2026-10-25) aparecem marcados e saem do total da lanchonete.
 *
 * @example <InvoiceDialog invoice={invoiceViewOfPreview(preview)} error={null} onClose={close} />
 */
export function InvoiceDialog({
  invoice,
  error,
  highlightCode,
  marking,
  actions,
  onClose,
}: InvoiceDialogProps) {
  return (
    <Dialog title={invoice?.vendorName ?? 'Nota fiscal'} onClose={onClose} wide>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!invoice && !error && <p className="page-message">Carregando a nota…</p>}
      {invoice && (
        <InvoiceSheet
          invoice={invoice}
          highlightCode={highlightCode}
          marking={marking}
        />
      )}
      <div className="dialog-actions">
        {invoice && (
          <a
            className="button button-secondary"
            href={sefazInvoiceUrl(invoice.accessKey)}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink aria-hidden />
            Abrir na SEFAZ
          </a>
        )}
        {actions}
        <button type="button" className="button" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Dialog>
  );
}

interface InvoiceSheetProps {
  invoice: InvoiceView;
  highlightCode?: string;
  marking?: OutsideMarking;
}

function InvoiceSheet({ invoice, highlightCode, marking }: InvoiceSheetProps) {
  const { items } = invoice;
  const positions = marking?.positions ?? savedOutsidePositions(items);
  const toggle = useOutsideToggle(items, positions, marking);
  const outside = outsideMarksOf(items, positions);
  return (
    <>
      <InvoiceFacts invoice={invoice} />
      {marking && (
        <p className="hint">
          Marque o que não é da lanchonete (compra de casa): sai do valor do
          gasto.
        </p>
      )}
      <InvoiceItemsTable
        items={items}
        outside={new Set(positions)}
        highlightCode={highlightCode}
        onToggle={toggle.onToggle}
      />
      {toggle.problem && (
        <p className="form-error" role="alert">
          {toggle.problem}
        </p>
      )}
      <InvoiceTotals invoice={invoice} outside={outside} />
      <LaunchedNotice invoice={invoice} outside={outside} />
    </>
  );
}

function InvoiceFacts({ invoice }: { invoice: InvoiceView }) {
  return (
    <dl className="invoice-facts">
      <div>
        <dt>Emitente</dt>
        <dd>
          {invoice.legalName}
          <small>CNPJ {formatCnpj(invoice.issuerCnpj)}</small>
        </dd>
      </div>
      <div>
        <dt>Nota</dt>
        <dd>{`nº ${invoice.number}, série ${invoice.series}`}</dd>
      </div>
      <div>
        <dt>Emissão</dt>
        <dd>{formatIssuedAt(invoice.issuedAt)}</dd>
      </div>
      <div>
        <dt>Pagamento</dt>
        <dd>{invoice.paymentLabel ?? 'Não informado'}</dd>
      </div>
    </dl>
  );
}

interface InvoiceTotalsProps {
  invoice: InvoiceView;
  outside: OutsideMarks;
}

function InvoiceTotals({ invoice, outside }: InvoiceTotalsProps) {
  return (
    <dl className="invoice-totals">
      <div>
        <dt>{`Total dos itens (${invoice.items.length})`}</dt>
        <dd>{formatMoney(invoice.itemsTotal)}</dd>
      </div>
      {invoice.discount !== '0.00' && (
        <div>
          <dt>Desconto</dt>
          <dd>{`− ${formatMoney(invoice.discount)}`}</dd>
        </div>
      )}
      <div className="invoice-due">
        <dt>A pagar</dt>
        <dd>{formatMoney(invoice.amountDue)}</dd>
      </div>
      {outside.positions.length > 0 && (
        <OutsideTotals amountDue={invoice.amountDue} outside={outside} />
      )}
    </dl>
  );
}

/** Quanto saiu da nota (itens de fora) e o que ficou para a lanchonete. */
function OutsideTotals({
  amountDue,
  outside,
}: {
  amountDue: string;
  outside: OutsideMarks;
}) {
  return (
    <>
      <div className="invoice-outside-total">
        <dt>{`Fora da lanchonete (${outside.positions.length})`}</dt>
        <dd>{`− ${formatMoney(centsToMoney(outside.cents))}`}</dd>
      </div>
      <div className="invoice-business-total">
        <dt>Da lanchonete</dt>
        <dd>{formatMoney(businessAmountOf(amountDue, outside.cents))}</dd>
      </div>
    </>
  );
}

/** O gasto lançado, quando difere do que a nota dá para a lanchonete. */
function LaunchedNotice({ invoice, outside }: InvoiceTotalsProps) {
  const launched = invoice.expenseAmount;
  const expected = businessAmountOf(invoice.amountDue, outside.cents);
  if (launched === null || launched === expected) return null;
  return (
    <p className="form-notice">{`Gasto lançado: ${formatMoney(launched)}`}</p>
  );
}
