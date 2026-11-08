import { ExternalLink } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { InvoiceView } from '../api/invoice-types';
import {
  centsToMoney,
  formatMoney,
  moneyToCents,
  toApiMoney,
  typedMoney,
} from '../api/money';
import { Dialog } from '../components/Dialog';
import { TextField } from '../components/TextField';
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
  const [problem, setProblem] = useState<string | null>(null);
  const effectiveMarking = marking && {
    ...marking,
    onProblemChange(msg: string | null) {
      setProblem(msg);
      marking.onProblemChange?.(msg);
    },
  };
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
          marking={effectiveMarking}
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
        <button
          type="button"
          className="button"
          onClick={onClose}
          disabled={Boolean(problem)}
        >
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

interface DiscountFieldState {
  showDiscountField: boolean;
  typedDiscount: string;
  problem: string | null;
  businessDiscount: string;
  onDiscountChange(typed: string): void;
}

function outsideGrossCentsOf(
  items: InvoiceView['items'],
  positions: number[],
): number {
  const chosen = new Set(positions);
  return items
    .filter((item) => chosen.has(item.position))
    .reduce((sum, item) => sum + moneyToCents(item.total), 0);
}

/**
 * Controla o campo "Quanto do desconto é da lanchonete" (pedido do usuário, 2026-11-08):
 * só aparece com desconto > 0 e ao menos um item marcado; preenchido com o desconto total.
 */
function useInvoiceDiscount(
  invoice: InvoiceView,
  positions: number[],
  marking?: OutsideMarking,
): DiscountFieldState {
  const discountCents = moneyToCents(invoice.discount);
  const showDiscountField = Boolean(
    marking && discountCents > 0 && positions.length > 0,
  );
  const initial =
    marking?.businessDiscount ?? invoice.businessDiscount ?? invoice.discount;
  const [typedDiscount, setTypedDiscount] = useState(() => typedMoney(initial));
  const [problem, setProblem] = useState<string | null>(null);

  const positionsKey = positions.join(',');
  const [prevPositionsKey, setPrevPositionsKey] = useState(positionsKey);
  if (positionsKey !== prevPositionsKey) {
    setPrevPositionsKey(positionsKey);
    const nextVal =
      positions.length === 0
        ? invoice.discount
        : (marking?.businessDiscount ?? invoice.discount);
    setTypedDiscount(typedMoney(nextVal));
    setProblem(null);
  }

  const onProblemChange = marking?.onProblemChange;
  useEffect(() => {
    onProblemChange?.(problem);
  }, [problem, onProblemChange]);

  const minCents = Math.max(
    0,
    discountCents - outsideGrossCentsOf(invoice.items, positions),
  );
  const businessDiscount =
    positions.length === 0
      ? invoice.discount
      : (marking?.businessDiscount ??
        invoice.businessDiscount ??
        invoice.discount);

  const onDiscountChange = (typed: string) => {
    setTypedDiscount(typed);
    const parsed = toApiMoney(typed);
    if (parsed === null) {
      setProblem('Valor inválido para o desconto');
      return;
    }
    const cents = moneyToCents(parsed);
    if (cents < minCents || cents > discountCents) {
      const minText = formatMoney(centsToMoney(minCents));
      const maxText = formatMoney(invoice.discount);
      setProblem(`O desconto deve ficar entre ${minText} e ${maxText}`);
      return;
    }
    setProblem(null);
    marking?.onChange(
      outsideMarksOf({
        items: invoice.items,
        positions,
        discount: invoice.discount,
        businessDiscount: parsed,
        amountDue: invoice.amountDue,
      }),
    );
  };

  return {
    showDiscountField,
    typedDiscount,
    problem,
    businessDiscount,
    onDiscountChange,
  };
}

function InvoiceSheet({ invoice, highlightCode, marking }: InvoiceSheetProps) {
  const { items } = invoice;
  const positions = marking?.positions ?? savedOutsidePositions(items);
  const discount = useInvoiceDiscount(invoice, positions, marking);
  const toggle = useOutsideToggle(
    items,
    positions,
    marking,
    invoice.discount,
    discount.businessDiscount,
    invoice.amountDue,
  );
  const outside = outsideMarksOf({
    items,
    positions,
    discount: invoice.discount,
    businessDiscount: discount.businessDiscount,
    amountDue: invoice.amountDue,
  });
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
      <InvoiceTotals
        invoice={invoice}
        outside={outside}
        discountField={discount}
      />
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
  discountField?: DiscountFieldState;
}

function InvoiceTotals({
  invoice,
  outside,
  discountField,
}: InvoiceTotalsProps) {
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
        <OutsideTotals
          amountDue={invoice.amountDue}
          outside={outside}
          discountField={discountField}
        />
      )}
    </dl>
  );
}

/** Quanto saiu da nota (itens de fora) e o que ficou para a lanchonete. */
function OutsideTotals({
  amountDue,
  outside,
  discountField,
}: {
  amountDue: string;
  outside: OutsideMarks;
  discountField?: DiscountFieldState;
}) {
  return (
    <>
      <div className="invoice-outside-total">
        <dt>{`Fora da lanchonete (${outside.positions.length})`}</dt>
        <dd>{`− ${formatMoney(centsToMoney(outside.cents))}`}</dd>
      </div>
      {discountField?.showDiscountField && (
        <div className="invoice-discount-row">
          <TextField
            label="Quanto do desconto é da lanchonete"
            inputMode="decimal"
            value={discountField.typedDiscount}
            onChange={discountField.onDiscountChange}
          />
          {discountField.problem && (
            <p className="form-error" role="alert">
              {discountField.problem}
            </p>
          )}
        </div>
      )}
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
