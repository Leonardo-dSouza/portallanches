import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../api/api-context';
import { formatQuantity } from '../api/quantity';
import { createStockApi, type StockApi } from '../api/stock-api';
import type { StockItem, SupplySection } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { SwitchField } from '../components/SwitchField';
import { formatDate } from '../history/date-keys';
import { SectionedRows } from './SectionedRows';
import { SectionFilterBar } from './SectionFilterBar';
import { alertsOf, describeLastCount, isCritical } from './stock-view';
import { SupplyMovementsDialog } from './SupplyMovementsDialog';
import { useSectionFilter } from './use-section-filter';

interface StatusTabProps {
  stock?: StockApi;
  items: StockItem[];
  sections: SupplySection[];
  today: string;
}

function StatusRow({
  item,
  today,
  onSelect,
}: {
  item: StockItem;
  today: string;
  onSelect(item: StockItem): void;
}) {
  const alerts = alertsOf(item, today);
  return (
    <tr
      data-critical={alerts.length > 0}
      className="cursor-pointer transition-colors hover:bg-sunken"
      tabIndex={0}
      aria-label={`Movimentações de ${item.name}`}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
    >
      <td className="strong">{item.name}</td>
      <td className="num strong" data-label="Saldo">
        {formatQuantity(item.quantity)} {item.countUnit}
      </td>
      <td data-label="Próxima validade">
        {item.nextExpiry ? formatDate(item.nextExpiry) : '—'}
      </td>
      <td className="muted-cell" data-label="Última contagem">
        {describeLastCount(item.lastCount, item.countUnit)}
      </td>
      <td data-label={alerts.length > 0 ? 'Alertas' : undefined}>
        <div className="alert-tags">
          {alerts.map((alert) => (
            <span key={alert.label} className="tag" data-tone={alert.tone}>
              {alert.label}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}

function OnlyCriticalToggle(props: {
  checked: boolean;
  onChange(v: boolean): void;
}) {
  return (
    <div className="catalog-toggle">
      <SwitchField
        label="Só os que precisam de atenção"
        Icon={TriangleAlert}
        checked={props.checked}
        onChange={props.onChange}
      />
    </div>
  );
}

/** Saldo de cada insumo com os alertas (vencido, vence em 7 dias, abaixo do mínimo, comprar). */
export function StatusTab({ stock, items, sections, today }: StatusTabProps) {
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<StockItem | null>(null);
  const api = useApi();
  const stockApi = stock ?? createStockApi(api);
  const shown = onlyCritical ? items.filter(isCritical) : items;
  const view = useSectionFilter(shown, sections);
  const criticalCount = items.filter(isCritical).length;
  if (items.length === 0)
    return (
      <EmptyState
        title="Nenhum insumo cadastrado"
        hint="O admin cadastra os insumos em Cadastros → Insumos."
      />
    );
  return (
    <div>
      <p className="hint stock-summary">
        {criticalCount === 0
          ? 'Nenhum insumo precisa de atenção agora.'
          : `${criticalCount} de ${items.length} insumos precisam de atenção.`}
      </p>
      <SectionFilterBar
        sections={sections}
        filter={view.filter}
        counts={view.counts}
        onChange={view.setFilter}
      />
      <OnlyCriticalToggle checked={onlyCritical} onChange={setOnlyCritical} />
      <div className="card card-flush">
        <div className="table-scroll">
          <table className="table table-stack">
            <thead>
              <tr>
                <th>Insumo</th>
                <th className="num">Saldo</th>
                <th>Próxima validade</th>
                <th>Última contagem</th>
                <th>Alertas</th>
              </tr>
            </thead>
            <SectionedRows
              groups={view.groups}
              columnCount={5}
              renderRow={(item) => (
                <StatusRow
                  key={item.supplyId}
                  item={item}
                  today={today}
                  onSelect={setSelectedSupply}
                />
              )}
            />
          </table>
        </div>
      </div>
      {selectedSupply && (
        <SupplyMovementsDialog
          supply={selectedSupply}
          stock={stockApi}
          today={today}
          onClose={() => setSelectedSupply(null)}
        />
      )}
    </div>
  );
}
