import { useCallback } from 'react';
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
import { PeriodContent } from './PeriodContent';
import { usePurchaseApi } from './use-purchase-api';

interface ProductHistoryDialogProps {
  product: ProductPriceSummary;
  range: DateRange;
  onClose(): void;
}

/** Compras do produto naquele mercado no período, da mais nova para a mais antiga. */
export function ProductHistoryDialog({
  product,
  range,
  onClose,
}: ProductHistoryDialogProps) {
  const purchases = usePurchaseApi();
  const load = useCallback(
    (period: DateRange) => purchases.productHistory(product, period),
    [purchases, product],
  );
  const state = useRangeData(load, range);
  return (
    <Dialog title={product.description} onClose={onClose} wide>
      <p className="hint">{`${product.vendorName}, cód. ${product.code}`}</p>
      <PeriodContent state={state} loadingLabel="Carregando as compras…">
        {(rows) => <HistoryTable rows={rows} />}
      </PeriodContent>
    </Dialog>
  );
}

function HistoryTable({ rows }: { rows: ProductPurchase[] }) {
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
        {rows.map((row, index) => (
          <tr key={`${row.invoiceId}-${index}`} className="items-table-item">
            <td>{`${formatQuantity(row.quantity)} ${row.unit}`}</td>
            <td>{formatIssuedAt(row.issuedAt)}</td>
            <td className="num">{row.invoiceNumber}</td>
            <td className="num">{formatAmount(row.unitPrice)}</td>
            <td className="num">{formatAmount(row.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
