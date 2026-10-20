import { History } from 'lucide-react';
import { useState } from 'react';
import { formatAmount } from '../api/money';
import type { ProductPriceSummary } from '../api/purchase-types';
import type { DateRange } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { SearchField } from '../components/SearchField';
import { useRangeData } from '../history/use-range-data';
import { formatIssuedAt } from './invoice-format';
import { PeriodContent } from './PeriodContent';
import { matchesSearch, priceChange } from './price-change';
import { PriceChangeTag } from './PriceChangeTag';
import { ProductHistoryDialog } from './ProductHistoryDialog';
import { usePurchaseApi } from './use-purchase-api';

/**
 * Compras → Preços: cada produto de cada mercado com o último preço, o anterior, a variação,
 * o menor e o maior do período. Comparar entre mercados é pela busca do nome (ligar ao insumo
 * fica para o estoque).
 */
export function PricesView({ range }: { range: DateRange | null }) {
  const purchases = usePurchaseApi();
  const state = useRangeData(purchases.products, range);
  return (
    <PeriodContent state={state} loadingLabel="Carregando os preços…">
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState
            title="Nenhum produto no período"
            hint="Os preços vêm dos itens das notas lançadas no Caixa."
          />
        ) : (
          <PricesTable rows={rows} range={range} />
        )
      }
    </PeriodContent>
  );
}

function PricesTable({
  rows,
  range,
}: {
  rows: ProductPriceSummary[];
  range: DateRange | null;
}) {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<ProductPriceSummary | null>(null);
  const shown = rows.filter((row) =>
    matchesSearch(query, row.description, row.code),
  );
  return (
    <>
      <div className="purchases-toolbar">
        <SearchField
          label="Buscar produto"
          placeholder="Nome ou código do produto"
          value={query}
          onChange={setQuery}
        />
        <p className="hint">Preços por unidade da nota, em reais.</p>
      </div>
      <div className="card card-flush">
        <div className="table-scroll">
          <table className="table purchases-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Mercado</th>
                <th>Un</th>
                <th className="num">Último</th>
                <th className="num">Anterior</th>
                <th>Variação</th>
                <th className="num">Menor</th>
                <th className="num">Maior</th>
                <th className="num">Compras</th>
                <th>Última compra</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <PriceRow
                  key={`${row.vendorId}|${row.code}`}
                  row={row}
                  onHistory={() => setHistory(row)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {history && range && (
        <ProductHistoryDialog
          product={history}
          range={range}
          onClose={() => setHistory(null)}
        />
      )}
    </>
  );
}

function PriceRow({
  row,
  onHistory,
}: {
  row: ProductPriceSummary;
  onHistory(): void;
}) {
  return (
    <tr>
      <td className="purchases-product">
        {row.description}
        <small>cód. {row.code}</small>
      </td>
      <td>{row.vendorName}</td>
      <td>{row.unit}</td>
      <td className="num strong">{formatAmount(row.lastPrice)}</td>
      <td className="num">
        {row.previousPrice === null ? '—' : formatAmount(row.previousPrice)}
      </td>
      <td>
        <PriceChangeTag
          change={priceChange(row.lastPrice, row.previousPrice)}
        />
      </td>
      <td className="num">{formatAmount(row.minPrice)}</td>
      <td className="num">{formatAmount(row.maxPrice)}</td>
      <td className="num">{row.purchaseCount}</td>
      <td className="purchases-date">
        {formatIssuedAt(row.lastPurchasedAt).slice(0, 10)}
      </td>
      <td className="row-actions">
        <button
          type="button"
          className="button-ghost button-sm"
          aria-label={`Histórico de ${row.description} no ${row.vendorName}`}
          onClick={onHistory}
        >
          <History aria-hidden />
          Histórico
        </button>
      </td>
    </tr>
  );
}
