import { Receipt } from 'lucide-react';
import { useCallback, useState } from 'react';
import { formatAmount } from '../api/money';
import type {
  ProductPriceSummary,
  ProductPurchase,
} from '../api/purchase-types';
import { formatQuantity } from '../api/quantity';
import type { DateRange } from '../api/types';
import { Dialog } from '../components/Dialog';
import { useRangeData } from '../history/use-range-data';
import { formatIssuedAt } from './invoice-format';
import { groupProductPurchases } from './invoice-item-groups';
import { PeriodContent } from './PeriodContent';
import { EditableInvoiceDialog } from './EditableInvoiceDialog';
import { usePurchaseApi } from './use-purchase-api';

interface ProductHistoryDialogProps {
  product: ProductPriceSummary;
  range: DateRange;
  /** Marcas de fora salvas numa nota daqui: os preços atrás relêem. */
  onChanged(): void;
  onClose(): void;
}

/**
 * Compras do produto naquele mercado no período, da mais nova para a mais antiga. Cada compra
 * abre a nota (2026-10-25) por cima do histórico, com a linha do produto destacada; fechar a
 * nota volta ao histórico.
 */
export function ProductHistoryDialog({
  product,
  range,
  onChanged,
  onClose,
}: ProductHistoryDialogProps) {
  const purchases = usePurchaseApi();
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const load = useCallback(
    (period: DateRange) => purchases.productHistory(product, period),
    [purchases, product],
  );
  const state = useRangeData(load, range);
  return (
    <>
      <Dialog title={product.description} onClose={onClose} wide>
        <p className="hint">{`${product.vendorName}, cód. ${product.code}`}</p>
        <PeriodContent state={state} loadingLabel="Carregando as compras…">
          {(rows) => <HistoryTable rows={rows} onOpen={setInvoiceId} />}
        </PeriodContent>
      </Dialog>
      {invoiceId !== null && (
        <EditableInvoiceDialog
          invoiceId={invoiceId}
          highlightCode={product.code}
          onSaved={() => {
            state.reload();
            onChanged();
          }}
          onClose={() => setInvoiceId(null)}
        />
      )}
    </>
  );
}

interface HistoryTableProps {
  rows: ProductPurchase[];
  onOpen(invoiceId: number): void;
}

function HistoryTable({ rows, onOpen }: HistoryTableProps) {
  return (
    <table className="items-table invoice-items">
      <thead>
        <tr>
          <th>Qtd</th>
          <th>Emissão</th>
          <th className="num">Nota</th>
          <th className="num">Unit.</th>
          <th className="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {groupProductPurchases(rows).map((row, index) => (
          <tr
            key={`${row.invoiceId}-${index}`}
            className="items-table-item"
            data-clickable="true"
            onClick={() => onOpen(row.invoiceId)}
          >
            <td className="invoice-qty">{`${formatQuantity(row.quantity)} ${row.unit}`}</td>
            <td>{formatIssuedAt(row.issuedAt)}</td>
            <td className="num">
              <InvoiceNumberButton
                number={row.invoiceNumber}
                onOpen={() => onOpen(row.invoiceId)}
              />
            </td>
            <td className="num">{formatAmount(row.unitPrice)}</td>
            <td className="num">{formatAmount(row.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** O número da nota como tecla (o teclado chega nela; o clique na linha faz o mesmo). */
function InvoiceNumberButton({
  number,
  onOpen,
}: {
  number: number;
  onOpen(): void;
}) {
  return (
    <button
      type="button"
      className="invoice-chip"
      aria-label={`Ver a nota ${number}`}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      <Receipt aria-hidden />
      {number}
    </button>
  );
}
