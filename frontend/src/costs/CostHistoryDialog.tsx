import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../api/api-context';
import { createCostApi, type CostApi } from '../api/cost-api';
import type { CostHistoryRow, CostSupply } from '../api/cost-types';
import { errorMessage } from '../api/error-message';
import { formatMoney } from '../api/money';
import { Dialog } from '../components/Dialog';
import { formatMovementDateTime } from '../stock/movement-format';
import { formatChoiceLabel, formatUnitCost } from './base-price-values';

/** Propriedades do diálogo de histórico de preços base e custos de um insumo. */
export interface CostHistoryDialogProps {
  supply: CostSupply;
  costApi?: CostApi;
  onClose(): void;
}

function formatBasePriceChange(row: CostHistoryRow, countUnit: string): string {
  const oldPrice = row.oldBasePrice ? formatMoney(row.oldBasePrice) : '—';
  const newPrice = row.newBasePrice ? formatMoney(row.newBasePrice) : '—';
  const choice = {
    label: row.baseLabel,
    quantity: row.baseQuantity ?? '1',
  };
  const pack = formatChoiceLabel(choice, countUnit);
  return `${oldPrice} → ${newPrice} (${pack})`;
}

function formatUnitCostChange(row: CostHistoryRow, countUnit: string): string {
  const oldCost = formatUnitCost(row.oldUnitCost, countUnit);
  const newCost = formatUnitCost(row.newUnitCost, countUnit);
  return `${oldCost} → ${newCost}`;
}

function useCostHistory(costApi: CostApi, supplyId: number) {
  const [rows, setRows] = useState<CostHistoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    costApi
      .history(supplyId)
      .then((data) => active && (setRows(data), setLoading(false)))
      .catch(
        (err) => active && (setError(errorMessage(err)), setLoading(false)),
      );
    return () => {
      active = false;
    };
  }, [costApi, supplyId]);
  return { rows, loading, error };
}

function HistoryRowItem({
  row,
  countUnit,
}: {
  row: CostHistoryRow;
  countUnit: string;
}) {
  return (
    <tr>
      <td>{formatMovementDateTime(row.createdAt)}</td>
      <td>{row.userName}</td>
      <td>{formatBasePriceChange(row, countUnit)}</td>
      <td className="num">{formatUnitCostChange(row, countUnit)}</td>
    </tr>
  );
}

function HistoryTableHeader() {
  return (
    <thead>
      <tr>
        <th>Data e hora</th>
        <th>Quem</th>
        <th>Preço base</th>
        <th className="num">Custo por unidade</th>
      </tr>
    </thead>
  );
}

interface HistoryRowsProps {
  rows: CostHistoryRow[];
  countUnit: string;
}

function HistoryRows({ rows, countUnit }: HistoryRowsProps) {
  return (
    <div className="table-scroll">
      <table className="table">
        <HistoryTableHeader />
        <tbody>
          {rows.map((row, i) => (
            <HistoryRowItem
              key={`${row.createdAt}-${i}`}
              row={row}
              countUnit={countUnit}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface HistoryBodyProps {
  loading: boolean;
  error: string | null;
  rows: CostHistoryRow[] | null;
  countUnit: string;
}

function HistoryDialogBody({
  loading,
  error,
  rows,
  countUnit,
}: HistoryBodyProps) {
  if (loading) return <p className="hint">Carregando histórico…</p>;
  if (error) return <p className="form-error">{error}</p>;
  if (!rows || rows.length === 0) {
    return <p className="hint">Sem mudanças registradas ainda.</p>;
  }
  return <HistoryRows rows={rows} countUnit={countUnit} />;
}

function useResolvedCostApi(explicitApi?: CostApi) {
  const api = useApi();
  return useMemo(() => explicitApi ?? createCostApi(api), [explicitApi, api]);
}

/**
 * Diálogo modal com o histórico de alterações de preço base e custo unitário de um insumo.
 *
 * @example <CostHistoryDialog supply={supply} onClose={close} />
 */
export function CostHistoryDialog({
  supply,
  costApi: explicitCostApi,
  onClose,
}: CostHistoryDialogProps) {
  const costApi = useResolvedCostApi(explicitCostApi);
  const { rows, loading, error } = useCostHistory(costApi, supply.id);
  return (
    <Dialog title={`Histórico: ${supply.name}`} onClose={onClose} wide>
      <HistoryDialogBody
        loading={loading}
        error={error}
        rows={rows}
        countUnit={supply.countUnit}
      />
    </Dialog>
  );
}
