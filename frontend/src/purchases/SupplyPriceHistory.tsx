import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
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

  return <HistoryTable rows={rows} />;
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
    <Dialog title={`Histórico: ${supply.name}`} onClose={onClose} wide>
      <SupplyPriceHistory supplyId={supply.id} />
    </Dialog>
  );
}
