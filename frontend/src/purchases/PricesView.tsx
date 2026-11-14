import { History } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { formatAmount } from '../api/money';
import type {
  ProductPriceSummary,
  SupplyLastPrice,
  SupplyLastPricesMap,
} from '../api/purchase-types';
import { createSupplyApi } from '../api/supply-api';
import type { DateRange, Supply } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { SearchField } from '../components/SearchField';
import { SubSections } from '../components/SubSections';
import { useRangeData } from '../history/use-range-data';
import {
  formatIssuedAt,
  formatBaseDiff,
  baseDiffTone,
  BASE_DIFF_TEXT_CLASS,
} from './invoice-format';
import { PeriodContent } from './PeriodContent';
import { matchesSearch, priceChange } from './price-change';
import { PriceChangeTag } from './PriceChangeTag';
import { ProductHistoryDialog } from './ProductHistoryDialog';
import { SupplyPriceHistoryDialog } from './SupplyPriceHistory';
import { usePurchaseApi } from './use-purchase-api';

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
                <th>
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
            title="Nenhum produto no período"
            hint="Os preços vêm dos itens das notas lançadas no Caixa."
          />
        ) : (
          <PricesTable rows={rows} range={range} onChanged={state.reload} />
        )
      }
    </PeriodContent>
  );
}

function SupplyPriceRow({
  supply,
  lastPrice,
  onHistory,
}: {
  supply: Supply;
  lastPrice: SupplyLastPrice;
  onHistory(): void;
}) {
  const diffClass = BASE_DIFF_TEXT_CLASS[baseDiffTone(lastPrice)];
  return (
    <tr data-clickable="true" onClick={onHistory}>
      <td className="font-medium text-ink">{supply.name}</td>
      <td className="purchases-vendor">{lastPrice.vendorName}</td>
      <td className="num strong">{formatAmount(lastPrice.paidPerUnit)}</td>
      <td>
        <span className={diffClass}>
          {formatBaseDiff(lastPrice.diffPercent)}
        </span>
      </td>
      <td className="purchases-date">
        {formatIssuedAt(lastPrice.issuedAt).slice(0, 10)}
      </td>
      <td className="row-actions">
        <button
          type="button"
          className="button-ghost button-sm"
          aria-label={`Histórico de ${supply.name}`}
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

function useSuppliesWithPrices() {
  const api = useApi();
  const purchases = usePurchaseApi();
  const supplyApi = useMemo(() => createSupplyApi(api), [api]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [lastPrices, setLastPrices] = useState<SupplyLastPricesMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([supplyApi.listSupplies(), purchases.lastPrices()]).then(
      ([allSupplies, pricesMap]) => {
        if (active) {
          setSupplies(allSupplies);
          setLastPrices(pricesMap);
          setLoading(false);
        }
      },
      () => {
        if (active) setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [supplyApi, purchases]);

  return { supplies, lastPrices, loading };
}

function SuppliesPriceView() {
  const { supplies, lastPrices, loading } = useSuppliesWithPrices();
  const [query, setQuery] = useState('');
  const [historySupply, setHistorySupply] = useState<Supply | null>(null);

  if (loading) {
    return <p className="page-message">Carregando os preços por insumo…</p>;
  }

  const linked = supplies.filter((s) => lastPrices[s.id] !== undefined);
  if (linked.length === 0) {
    return (
      <EmptyState
        title="Nenhum insumo com compra ligada"
        hint="Ligue os itens das notas em Compras → Notas para ver os preços por insumo."
      />
    );
  }

  const shown = linked.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="purchases-toolbar">
        <SearchField
          label="Buscar insumo"
          placeholder="Nome do insumo"
          value={query}
          onChange={setQuery}
        />
        <p className="hint">Preços da última compra de cada insumo ligado.</p>
      </div>
      <div className="card card-flush">
        <div className="table-scroll">
          <table className="table purchases-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Mercado</th>
                <th className="num">Último pago/un</th>
                <th>Variação</th>
                <th>Última compra</th>
                <th>
                  <span className="sr-only">Histórico</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((supply) => (
                <SupplyPriceRow
                  key={supply.id}
                  supply={supply}
                  lastPrice={lastPrices[supply.id]}
                  onHistory={() => setHistorySupply(supply)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {historySupply && (
        <SupplyPriceHistoryDialog
          supply={historySupply}
          onClose={() => setHistorySupply(null)}
        />
      )}
    </>
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
          render: () => <SuppliesPriceView />,
        },
      ]}
    />
  );
}
