import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { useState } from 'react';
import { formatMoney } from '../api/money';
import type {
  BoardMarket,
  BoardProduct,
  SupplyPriceBoardRow,
} from '../api/purchase-types';
import type { DateRange } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { SearchField } from '../components/SearchField';
import { formatUnitPrice } from '../costs/base-price-values';
import { useRangeData } from '../history/use-range-data';
import { formatIssuedAt } from './invoice-format';
import { matchesSearch } from './price-change';
import { PeriodContent } from './PeriodContent';
import { SupplyPriceHistoryDialog } from './SupplyPriceHistory';
import { usePurchaseApi } from './use-purchase-api';

/** "R$ 36,90/kg": pago por unidade do insumo (2 casas a partir de R$ 0,10, 4 abaixo). */
const perUnit = (paidPerUnit: string, countUnit: string) =>
  `${formatUnitPrice(paidPerUnit)}/${countUnit}`;

const dayOf = (iso: string) => formatIssuedAt(iso).slice(0, 10);

const purchasesText = (count: number) =>
  count === 1 ? '1 compra' : `${count} compras`;

function BoardFigure(props: { label: string; value: string; detail: string }) {
  return (
    <span className="board-figure">
      <span className="board-label">{props.label}</span>
      <strong>{props.value}</strong>
      <span>{props.detail}</span>
    </span>
  );
}

function BoardRowButton(props: {
  row: SupplyPriceBoardRow;
  open: boolean;
  onToggle(): void;
}) {
  const { row, open } = props;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      className="board-row"
      aria-expanded={open}
      onClick={props.onToggle}
    >
      <span className="board-name">{row.supplyName}</span>
      <BoardFigure
        label="pagou por último"
        value={perUnit(row.last.paidPerUnit, row.countUnit)}
        detail={`${row.last.vendorName}, ${dayOf(row.last.issuedAt)}`}
      />
      <BoardFigure
        label="mais barato"
        value={perUnit(row.cheapest.paidPerUnit, row.countUnit)}
        detail={`${row.cheapest.productName} no ${row.cheapest.vendorName}`}
      />
      <BoardFigure
        label="gasto no período"
        value={formatMoney(row.spent)}
        detail={purchasesText(row.purchaseCount)}
      />
      <Chevron className="board-chevron" aria-hidden />
    </button>
  );
}

function MarketLine({
  market,
  countUnit,
  compared,
}: {
  market: BoardMarket;
  countUnit: string;
  /** A marca tem mais de um mercado: só aí o "mais barato" diz alguma coisa. */
  compared: boolean;
}) {
  return (
    <li className={market.cheapest ? 'is-cheapest' : undefined}>
      <span className="board-market">{market.vendorName}</span>
      <strong>{perUnit(market.paidPerUnit, countUnit)}</strong>
      <span>{`${dayOf(market.issuedAt)}, ${purchasesText(market.purchaseCount)}`}</span>
      {compared && market.cheapest && (
        <span className="tag tag-success">mais barato</span>
      )}
    </li>
  );
}

function ProductMarkets(props: { product: BoardProduct; countUnit: string }) {
  const { product, countUnit } = props;
  return (
    <section className="board-product" aria-label={product.productName}>
      <h4>{product.productName}</h4>
      <ul>
        {product.markets.map((market) => (
          <MarketLine
            key={market.vendorName}
            market={market}
            countUnit={countUnit}
            compared={product.markets.length > 1}
          />
        ))}
      </ul>
    </section>
  );
}

function BoardDetail(props: { row: SupplyPriceBoardRow; onHistory(): void }) {
  const { row } = props;
  return (
    <div className="board-detail">
      {row.products.map((product) => (
        <ProductMarkets
          key={product.productName}
          product={product}
          countUnit={row.countUnit}
        />
      ))}
      <button
        type="button"
        className="button button-secondary button-sm"
        aria-label={`Ver o histórico do ${row.supplyName}`}
        onClick={props.onHistory}
      >
        <History aria-hidden />
        Ver o histórico
      </button>
    </div>
  );
}

function BoardList({ rows }: { rows: SupplyPriceBoardRow[] }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [history, setHistory] = useState<SupplyPriceBoardRow | null>(null);
  const shown = rows.filter((row) => matchesSearch(query, row.supplyName));
  const toggle = (id: number) =>
    setOpenId((current) => (current === id ? null : id));
  return (
    <>
      <div className="purchases-toolbar">
        <SearchField
          label="Buscar insumo"
          placeholder="Nome do insumo"
          value={query}
          onChange={setQuery}
        />
        <p className="hint">
          Preços por unidade do insumo. Abra o insumo para comparar as marcas e
          os mercados.
        </p>
      </div>
      <ul className="card card-flush board-list">
        {shown.map((row) => (
          <li key={row.supplyId}>
            <BoardRowButton
              row={row}
              open={openId === row.supplyId}
              onToggle={() => toggle(row.supplyId)}
            />
            {openId === row.supplyId && (
              <BoardDetail row={row} onHistory={() => setHistory(row)} />
            )}
          </li>
        ))}
      </ul>
      {history && (
        <SupplyPriceHistoryDialog
          supply={{ id: history.supplyId, name: history.supplyName }}
          onClose={() => setHistory(null)}
        />
      )}
    </>
  );
}

/**
 * Compras → Preços → Por insumo (2026-11-18): quanto pagou, onde foi mais barato e, por marca, o
 * último preço de cada mercado; o histórico do insumo abre daqui.
 *
 * @example <SupplyPriceBoard range={range} />
 */
export function SupplyPriceBoard({ range }: { range: DateRange | null }) {
  const purchases = usePurchaseApi();
  const state = useRangeData(purchases.priceBoard, range);
  return (
    <PeriodContent
      state={state}
      loadingLabel="Carregando os preços por insumo…"
    >
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState
            title="Nenhum insumo com compra ligada"
            hint="Ligue os itens das notas em Compras → Notas para ver os preços por insumo."
          />
        ) : (
          <BoardList rows={rows} />
        )
      }
    </PeriodContent>
  );
}
