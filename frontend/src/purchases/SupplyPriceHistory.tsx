import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { toNeighborhoodKey } from '../cash/neighborhood-key';
import { formatAmount } from '../api/money';
import { createPurchaseApi } from '../api/purchase-api';
import type { SupplyPriceRecord } from '../api/purchase-types';
import { formatQuantity } from '../api/quantity';
import { Dialog } from '../components/Dialog';
import {
  formatIssuedAt,
  formatBaseDiff,
  baseDiffTone,
  BASE_DIFF_TEXT_CLASS,
} from './invoice-format';

interface SupplyPriceHistoryProps {
  supplyId: number;
}

function useSupplyPriceHistory(supplyId: number) {
  const api = useApi();
  const purchases = useMemo(() => createPurchaseApi(api), [api]);
  const [rows, setRows] = useState<SupplyPriceRecord[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    purchases.supplyPrices(supplyId).then(
      (data) => {
        if (active) {
          setRows(data);
          setLoading(false);
        }
      },
      () => {
        if (active) {
          setRows([]);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [purchases, supplyId]);

  return { rows, loading };
}

function HistoryRowItem({ row }: { row: SupplyPriceRecord }) {
  const diffClass = BASE_DIFF_TEXT_CLASS[baseDiffTone(row)];
  return (
    <tr>
      <td className="purchases-date">{formatIssuedAt(row.issuedAt)}</td>
      <td>{row.vendorName}</td>
      <td>{row.productName}</td>
      <td>{row.description}</td>
      <td className="num">{`${formatQuantity(row.quantity)} ${row.unit}`}</td>
      <td className="num">{formatAmount(row.unitPrice)}</td>
      <td className="num">{formatAmount(row.paidPerUnit)}</td>
      <td className="num">
        {row.basePerUnit === null ? '—' : formatAmount(row.basePerUnit)}
      </td>
      <td className="num">
        <span className={diffClass}>{formatBaseDiff(row.diffPercent)}</span>
      </td>
    </tr>
  );
}

function HistoryTableHeader() {
  return (
    <thead>
      <tr>
        <th>Data</th>
        <th>Mercado</th>
        <th>Produto</th>
        <th>Descrição na nota</th>
        <th className="num">Qtd</th>
        <th className="num">Pago embalagem</th>
        <th className="num">Pago/un</th>
        <th className="num">Base/un</th>
        <th className="num">Diferença %</th>
      </tr>
    </thead>
  );
}

function HistoryTable({ rows }: { rows: SupplyPriceRecord[] }) {
  return (
    <div className="table-scroll">
      <table className="table purchases-table">
        <HistoryTableHeader />
        <tbody>
          {rows.map((row, index) => (
            <HistoryRowItem
              key={`${row.invoiceId}-${row.description}-${index}`}
              row={row}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Lista de compras vinculadas a um insumo com histórico de preço pago e custo base na data.
 *
 * @example <SupplyPriceHistory supplyId={10} />
 */
export function SupplyPriceHistory({ supplyId }: SupplyPriceHistoryProps) {
  const { rows, loading } = useSupplyPriceHistory(supplyId);

  if (loading) {
    return <p className="page-message">Carregando histórico…</p>;
  }

  if (!rows || rows.length === 0) {
    return (
      <p className="hint">
        Nenhuma compra ligada a este insumo ainda. Ligue os itens das notas em
        Compras → Notas.
      </p>
    );
  }

  return <FilteredHistory rows={rows} />;
}

/**
 * Marcas do histórico (compras da mais nova para a mais antiga): o nome sem acento e sem
 * maiúscula junta, como no quadro (`price-board.ts`); o botão mostra a grafia da compra mais nova.
 *
 * @example productGroups([{ productName: 'Bacon Seara kg' }, { productName: 'bacon seara KG' }]) // Map { 'bacon seara kg' → 'Bacon Seara kg' }
 */
function productGroups(rows: { productName: string }[]): Map<string, string> {
  const groups = new Map<string, string>();
  for (const { productName } of rows) {
    const key = toNeighborhoodKey(productName);
    if (!groups.has(key)) groups.set(key, productName);
  }
  return groups;
}

/**
 * Filtro por produto (marca) do histórico: "Todos" e um por produto, quando há mais de um.
 */
function ProductFilter(props: {
  products: Map<string, string>;
  active: string | null;
  onSelect(productKey: string | null): void;
}) {
  const keys: [string | null, string][] = [[null, 'Todos'], ...props.products];
  return (
    <div
      className="history-filter"
      role="group"
      aria-label="Filtrar por produto"
    >
      {keys.map(([key, label]) => (
        <button
          key={key ?? 'todos'}
          type="button"
          className="toggle-key toggle-key-sm"
          aria-pressed={props.active === key}
          onClick={() => props.onSelect(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FilteredHistory({ rows }: { rows: SupplyPriceRecord[] }) {
  const [product, setProduct] = useState<string | null>(null);
  const products = productGroups(rows);
  const shown =
    product === null
      ? rows
      : rows.filter((row) => toNeighborhoodKey(row.productName) === product);
  return (
    <>
      {products.size > 1 && (
        <ProductFilter
          products={products}
          active={product}
          onSelect={setProduct}
        />
      )}
      <HistoryTable rows={shown} />
    </>
  );
}

/**
 * Diálogo modal exibindo o histórico de preços de compra de um insumo.
 *
 * @example <SupplyPriceHistoryDialog supply={{ id: 10, name: 'Hambúrguer 56g' }} onClose={close} />
 */
export function SupplyPriceHistoryDialog({
  supply,
  onClose,
}: {
  supply: { id: number; name: string };
  onClose(): void;
}) {
  return (
    <Dialog
      title={`Histórico: ${supply.name}`}
      onClose={onClose}
      wide
      className="supply-history-dialog"
    >
      <SupplyPriceHistory supplyId={supply.id} />
    </Dialog>
  );
}
