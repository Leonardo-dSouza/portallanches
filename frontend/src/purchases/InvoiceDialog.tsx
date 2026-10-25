import { ExternalLink } from 'lucide-react';
import type { InvoiceItem, InvoiceView } from '../api/invoice-types';
import { formatAmount, formatMoney } from '../api/money';
import { formatQuantity } from '../api/quantity';
import { Dialog } from '../components/Dialog';
import { formatCnpj, formatIssuedAt, sefazInvoiceUrl } from './invoice-format';

interface InvoiceDialogProps {
  /** null enquanto a nota carrega. */
  invoice: InvoiceView | null;
  error: string | null;
  /** Código do produto cuja linha fica destacada (vindo do Histórico do produto). */
  highlightCode?: string;
  onClose(): void;
}

/**
 * A nota fiscal como no cupom: mercado, emissão, itens em colunas e os totais. Usada no Caixa
 * (antes e depois de salvar o gasto), na Análise do dia e em Compras.
 *
 * @example <InvoiceDialog invoice={invoiceViewOfPreview(preview)} error={null} onClose={close} />
 */
export function InvoiceDialog({
  invoice,
  error,
  highlightCode,
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
        <InvoiceSheet invoice={invoice} highlightCode={highlightCode} />
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
        <button type="button" className="button" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Dialog>
  );
}

function InvoiceSheet({
  invoice,
  highlightCode,
}: {
  invoice: InvoiceView;
  highlightCode?: string;
}) {
  const launched = invoice.expenseAmount;
  return (
    <>
      <InvoiceFacts invoice={invoice} />
      <InvoiceItemsTable items={invoice.items} highlightCode={highlightCode} />
      <InvoiceTotals invoice={invoice} />
      {launched !== null && launched !== invoice.amountDue && (
        <p className="form-notice">{`Gasto lançado: ${formatMoney(launched)}`}</p>
      )}
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

function InvoiceItemsTable({
  items,
  highlightCode,
}: {
  items: InvoiceItem[];
  highlightCode?: string;
}) {
  return (
    <table className="items-table invoice-items">
      <thead>
        <tr>
          <th>Qtd</th>
          <th>Produto</th>
          <th className="num">Unit.</th>
          <th className="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.position}
            className="items-table-item"
            data-highlight={item.code === highlightCode}
          >
            <td>{`${formatQuantity(item.quantity)} ${item.unit}`}</td>
            <td>
              {item.description}
              <small>cód. {item.code}</small>
            </td>
            <td className="num">{formatAmount(item.unitPrice)}</td>
            <td className="num">{formatAmount(item.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InvoiceTotals({ invoice }: { invoice: InvoiceView }) {
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
    </dl>
  );
}
