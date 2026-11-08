import { formatQuantity } from '../api/quantity';
import type { StockApi } from '../api/stock-api';
import type {
  DateRange,
  StockItem,
  StockMovementKind,
  StockMovementTotals,
  SupplyMovementItem,
} from '../api/types';
import { DateRangeField } from '../calendar/DateRangeField';
import { Dialog } from '../components/Dialog';
import { SelectField } from '../components/SelectField';
import { Skeleton } from '../components/Skeleton';
import {
  formatAdjustedQuantity,
  formatMovementDateTime,
  formatMovementQuantity,
} from './movement-format';
import { useSupplyMovements } from './use-supply-movements';

const KIND_OPTIONS: { value: StockMovementKind; label: string }[] = [
  { value: 'ENTRY', label: 'Entrada' },
  { value: 'COUNT', label: 'Contagem' },
  { value: 'REVERSAL', label: 'Estorno' },
  { value: 'SALE', label: 'Venda' },
  { value: 'SALE_RETURN', label: 'Devolução' },
];

interface FiltersProps {
  range: DateRange;
  today: string;
  kind: StockMovementKind | '';
  onRangeChange(range: DateRange): void;
  onKindChange(kind: StockMovementKind | ''): void;
}

function MovementsFiltersBar({
  range,
  today,
  kind,
  onRangeChange,
  onKindChange,
}: FiltersProps) {
  return (
    <div className="movements-filters">
      <DateRangeField
        label="Período"
        value={range}
        today={today}
        onChange={onRangeChange}
      />
      <SelectField
        label="Tipo"
        value={kind}
        options={KIND_OPTIONS}
        emptyLabel="Todos os tipos"
        onChange={(value) => onKindChange(value as StockMovementKind | '')}
      />
    </div>
  );
}

function MovementsSummaryBar({
  totals,
  unit,
}: {
  totals: StockMovementTotals;
  unit: string;
}) {
  return (
    <div className="movements-summary">
      <div className="movement-stat">
        <span className="movement-stat-label">Entrou</span>
        <span className="movement-stat-value">
          +{formatQuantity(totals.entered)} {unit}
        </span>
      </div>
      <div className="movement-stat">
        <span className="movement-stat-label">Vendeu</span>
        <span className="movement-stat-value">
          {formatQuantity(totals.sold)} {unit}
        </span>
      </div>
      <div className="movement-stat">
        <span className="movement-stat-label">Ajustou</span>
        <span className="movement-stat-value">
          {formatAdjustedQuantity(totals.adjusted)} {unit}
        </span>
      </div>
    </div>
  );
}

function MovementRow({
  item,
  unit,
}: {
  item: SupplyMovementItem;
  unit: string;
}) {
  return (
    <tr>
      <td data-label="Data/Hora" className="muted-cell">
        {formatMovementDateTime(item.createdAt)}
      </td>
      <td data-label="Tipo">
        <span className="tag">{item.kindLabel}</span>
      </td>
      <td data-label="Origem">{item.origin ?? '—'}</td>
      <td data-label="Quantidade" className="num strong">
        {formatMovementQuantity(item.quantity)} {unit}
      </td>
      <td data-label="Saldo depois" className="num">
        {formatQuantity(item.balanceAfter)} {unit}
      </td>
      <td data-label="Quem" className="muted-cell">
        {item.createdByName}
      </td>
    </tr>
  );
}

function MovementsTable({
  movements,
  unit,
}: {
  movements: SupplyMovementItem[];
  unit: string;
}) {
  if (movements.length === 0) {
    return <p className="hint">Nenhuma movimentação no período selecionado.</p>;
  }
  return (
    <div className="card card-flush">
      <div className="table-scroll">
        <table className="table table-stack">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Tipo</th>
              <th>Origem</th>
              <th className="num">Quantidade</th>
              <th className="num">Saldo depois</th>
              <th>Quem</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <MovementRow key={m.id} item={m} unit={unit} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SupplyMovementsDialogProps {
  supply: StockItem;
  stock: StockApi;
  today: string;
  onClose(): void;
}

/**
 * Diálogo com o histórico de movimentações do insumo, filtros por período e tipo,
 * e totalizadores de entradas, vendas e contagens.
 *
 * @example <SupplyMovementsDialog supply={item} stock={stock} today="2026-11-05" onClose={close} />
 */
export function SupplyMovementsDialog({
  supply,
  stock,
  today,
  onClose,
}: SupplyMovementsDialogProps) {
  const state = useSupplyMovements(stock, supply.supplyId, today);
  const unit = state.report?.supply.countUnit ?? supply.countUnit;

  return (
    <Dialog
      title={`Movimentações: ${supply.name}`}
      onClose={onClose}
      wide
      className="movements-dialog"
    >
      <MovementsFiltersBar
        range={state.range}
        today={today}
        kind={state.kind}
        onRangeChange={state.setRange}
        onKindChange={state.setKind}
      />
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.report && (
        <MovementsSummaryBar totals={state.report.totals} unit={unit} />
      )}
      {state.loading && !state.report && (
        <Skeleton label="Carregando movimentações…" rows={4} />
      )}
      {state.report && (
        <MovementsTable movements={state.report.movements} unit={unit} />
      )}
    </Dialog>
  );
}
