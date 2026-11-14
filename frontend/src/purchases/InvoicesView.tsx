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
import { formatStockEnteredBadge } from './invoice-stock-entry';
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

/**
 * A busca acha a nota pelo mercado, pelo número ou pela data (2026-11-14: sem os atalhos de
 * período, o dono procura "30/10"): a da emissão ("30/10/2026 14:20") e a da noite ("qui 30/10").
 *
 * @example invoiceMatches('30/10', row) // true para uma nota emitida em 30/10
 */
function invoiceMatches(query: string, row: PurchaseInvoiceRow): boolean {
  return matchesSearch(
    query,
    row.vendorName,
    String(row.number),
    formatIssuedAt(row.issuedAt),
    formatDayLabel(row.businessDate),
  );
}

/** Compras → Notas: as notas do período, pela emissão, para achar a de um dia sem o papel. */
export function InvoicesView({ range }: { range: DateRange | null }) {
  const purchases = usePurchaseApi();
  const state = useRangeData(purchases.invoices, range);
  return (
    <PeriodContent state={state} loadingLabel="Carregando as notas…">
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState
            title="Nenhuma nota nos últimos 12 meses"
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
  const shown = rows.filter((row) => invoiceMatches(query, row));
  return (
    <>
      <div className="purchases-toolbar">
        <SearchField
          label="Buscar nota"
          placeholder="Mercado, nº ou data (ex.: 30/10)"
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
          purchaseInvoice={rows.find((r) => r.id === viewing)}
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
      <td className="purchases-date">
        <div>{formatIssuedAt(row.issuedAt)}</div>
        {row.stockEnteredAt && (
          <span className="tag tag-success inline-block mt-0.5 text-xs">
            {formatStockEnteredBadge(
              row.stockEnteredAt,
              row.stockEnteredByName,
            )}
          </span>
        )}
      </td>
      <td>{row.vendorName}</td>
      <td className="num">{row.number}</td>
      <td className="num">
        {row.itemCount}
        {row.outsideItemCount > 0 && (
          <small className="purchases-outside">
            {outsideLabel(row.outsideItemCount)}
          </small>
        )}
        {row.aboveBaseCount > 0 && (
          <small className="purchases-above">
            {`${row.aboveBaseCount} acima da base`}
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
