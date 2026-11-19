import { History } from 'lucide-react';
import { useState } from 'react';
import { formatAmount } from '../api/money';
import type { ProductPriceSummary } from '../api/purchase-types';
import type { DateRange } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { SearchField } from '../components/SearchField';
import { SubSections } from '../components/SubSections';
import { useRangeData } from '../history/use-range-data';
import { formatIssuedAt } from './invoice-format';
import { PeriodContent } from './PeriodContent';
import { matchesSearch, priceChange } from './price-change';
import { PriceChangeTag } from './PriceChangeTag';
import { ProductHistoryDialog } from './ProductHistoryDialog';
import { SupplyPriceBoard } from './SupplyPriceBoard';
import { usePurchaseApi } from './use-purchase-api';

/** A que produto (com a marca) o item está ligado, para achar o que falta ligar (2026-11-18). */
function LinkTag({ link }: { link: ProductPriceSummary['link'] }) {
  if (!link) return <small className="purchases-unlinked">sem insumo</small>;
  return (
    <small className="purchases-linked" title={`Insumo: ${link.supplyName}`}>
      {`→ ${link.productName ?? link.supplyName}`}
    </small>
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
    <tr data-clickable="true" onClick={onHistory}>
      <td className="purchases-product">
        {row.description}
        <small>cód. {row.code}</small>
        <LinkTag link={row.link} />
      </td>
      <td className="purchases-vendor">{row.vendorName}</td>
      <td>{row.unit}</td>
      <td className="num strong">{formatAmount(row.lastPrice)}</td>
      <td className="num purchases-secondary">
        {row.previousPrice === null ? '—' : formatAmount(row.previousPrice)}
      </td>
      <td>
        <PriceChangeTag
          change={priceChange(row.lastPrice, row.previousPrice)}
        />
      </td>
      <td className="num purchases-secondary">{formatAmount(row.minPrice)}</td>
      <td className="num purchases-secondary">{formatAmount(row.maxPrice)}</td>
      <td className="num">{row.purchaseCount}</td>
      <td className="purchases-date">
        {formatIssuedAt(row.lastPurchasedAt).slice(0, 10)}
      </td>
      <td className="row-actions">
        <button
          type="button"
          className="button-ghost button-sm"
          aria-label={`Histórico de ${row.description} no ${row.vendorName}`}
          title="Histórico"
          onClick={(event) => {
            event.stopPropagation();
            onHistory();
          }}
        >
          <History aria-hidden />
        </button>
      </td>
    </tr>
  );
}

function PricesTable({
  rows,
  range,
  onChanged,
}: {
  rows: ProductPriceSummary[];
  range: DateRange | null;
  onChanged(): void;
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
                <th className="num purchases-secondary">Anterior</th>
                <th>Variação</th>
                <th className="num purchases-secondary">Menor</th>
                <th className="num purchases-secondary">Maior</th>
                <th className="num">Compras</th>
                <th>Última compra</th>
                {/* relative: o sr-only absoluto escapava da rolagem e alargava a página no celular. */}
                <th className="relative">
                  <span className="sr-only">Histórico</span>
                </th>
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
          onChanged={onChanged}
          onClose={() => setHistory(null)}
        />
      )}
    </>
  );
}

function ProductsPriceView({ range }: { range: DateRange | null }) {
  const purchases = usePurchaseApi();
  const state = useRangeData(purchases.products, range);
  return (
    <PeriodContent state={state} loadingLabel="Carregando os preços…">
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState
            title="Nenhum produto nos últimos 12 meses"
            hint="Os preços vêm dos itens das notas lançadas no Caixa."
          />
        ) : (
          <PricesTable rows={rows} range={range} onChanged={state.reload} />
        )
      }
    </PeriodContent>
  );
}

/**
 * Compras → Preços: visualização por produto ou por insumo do estoque.
 *
 * @example <PricesView range={range} />
 */
export function PricesView({ range }: { range: DateRange | null }) {
  return (
    <SubSections
      sections={[
        {
          id: 'products',
          label: 'Por produto',
          render: () => <ProductsPriceView range={range} />,
        },
        {
          id: 'supplies',
          label: 'Por insumo',
          render: () => <SupplyPriceBoard range={range} />,
        },
      ]}
    />
  );
}
