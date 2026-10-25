import { Receipt } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { centsToMoney, formatMoney, moneyToCents } from '../api/money';
import type { PurchaseInvoiceRow } from '../api/purchase-types';
import type { DateRange } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { SearchField } from '../components/SearchField';
import { formatDayLabel } from '../history/date-keys';
import { dayAnalyticsLink } from '../history/history-link';
import { useRangeData } from '../history/use-range-data';
import { formatIssuedAt } from './invoice-format';
import { PeriodContent } from './PeriodContent';
import { matchesSearch } from './price-change';
import { EditableInvoiceDialog } from './EditableInvoiceDialog';
import { outsideLabel } from './outside-items';
import { usePurchaseApi } from './use-purchase-api';

const sumOf = (
  rows: PurchaseInvoiceRow[],
  pick: (row: PurchaseInvoiceRow) => string,
) =>
  formatMoney(
    centsToMoney(rows.reduce((sum, row) => sum + moneyToCents(pick(row)), 0)),
  );

/** Compras → Notas: as notas do período, pela emissão, para achar a de um dia sem o papel. */
export function InvoicesView({ range }: { range: DateRange | null }) {
  const purchases = usePurchaseApi();
  const state = useRangeData(purchases.invoices, range);
  return (
    <PeriodContent state={state} loadingLabel="Carregando as notas…">
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState
            title="Nenhuma nota no período"
            hint="As notas entram pelo Caixa, em Gastos, lidas pelo QR Code do cupom."
          />
        ) : (
          <InvoicesTable rows={rows} onChanged={state.reload} />
        )
      }
    </PeriodContent>
  );
}

function InvoicesTable({
  rows,
  onChanged,
}: {
  rows: PurchaseInvoiceRow[];
  /** Marcas de fora salvas numa nota: o gasto mudou, a lista relê. */
  onChanged(): void;
}) {
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState<number | null>(null);
  const shown = rows.filter((row) =>
    matchesSearch(query, row.vendorName, String(row.number)),
  );
  return (
    <>
      <div className="purchases-toolbar">
        <SearchField
          label="Buscar nota"
          placeholder="Mercado ou nº da nota"
          value={query}
          onChange={setQuery}
        />
      </div>
      <div className="card card-flush">
        <div className="table-scroll">
          <table className="table purchases-table">
            <thead>
              <tr>
                <th>Emissão</th>
                <th>Mercado</th>
                <th className="num">Nº</th>
                <th className="num">Itens</th>
                <th className="num">Nota</th>
                <th className="num">Gasto</th>
                <th>Noite</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <InvoiceRow
                  key={row.id}
                  row={row}
                  onView={() => setViewing(row.id)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="totals">
                <th colSpan={4}>{`Total (${shown.length})`}</th>
                <td className="num strong">
                  {sumOf(shown, (r) => r.amountDue)}
                </td>
                <td className="num">{sumOf(shown, (r) => r.expenseAmount)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      {viewing !== null && (
        <EditableInvoiceDialog
          invoiceId={viewing}
          onSaved={onChanged}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}

function InvoiceRow({
  row,
  onView,
}: {
  row: PurchaseInvoiceRow;
  onView(): void;
}) {
  return (
    <tr>
      <td className="purchases-date">{formatIssuedAt(row.issuedAt)}</td>
      <td>{row.vendorName}</td>
      <td className="num">{row.number}</td>
      <td className="num">
        {row.itemCount}
        {row.outsideItemCount > 0 && (
          <small className="purchases-outside">
            {outsideLabel(row.outsideItemCount)}
          </small>
        )}
      </td>
      <td className="num strong">{formatMoney(row.amountDue)}</td>
      <td className="num" data-differs={row.expenseAmount !== row.amountDue}>
        {formatMoney(row.expenseAmount)}
      </td>
      <td>
        <Link
          className="purchases-night"
          to={dayAnalyticsLink(row.businessDate)}
        >
          {formatDayLabel(row.businessDate)}
        </Link>
      </td>
      <td className="row-actions">
        <button
          type="button"
          className="button button-secondary button-sm"
          aria-label={`Ver a nota ${row.number}`}
          onClick={onView}
        >
          <Receipt aria-hidden />
          Ver
        </button>
      </td>
    </tr>
  );
}
