import { useState } from 'react';
import { formatQuantity } from '../api/quantity';
import type { StockItem, SupplySection } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../history/date-keys';
import { SectionedRows } from './SectionedRows';
import { SectionFilterBar } from './SectionFilterBar';
import { alertsOf, describeLastCount, isCritical } from './stock-view';
import { useSectionFilter } from './use-section-filter';

interface StatusTabProps {
  items: StockItem[];
  sections: SupplySection[];
  today: string;
}

function StatusRow({ item, today }: { item: StockItem; today: string }) {
  const alerts = alertsOf(item, today);
  return (
    <tr data-critical={alerts.length > 0}>
      <td className="strong">{item.name}</td>
      <td className="num strong">
        {formatQuantity(item.quantity)} {item.countUnit}
      </td>
      <td>{item.nextExpiry ? formatDate(item.nextExpiry) : '—'}</td>
      <td className="muted-cell">
        {describeLastCount(item.lastCount, item.countUnit)}
      </td>
      <td>
        <div className="alert-tags">
          {alerts.length === 0 && <span className="tag">Em dia</span>}
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
    <label className="catalog-toggle">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      Só os que precisam de atenção
    </label>
  );
}

/** Saldo de cada insumo com os alertas (vencido, vence em 7 dias, abaixo do mínimo, comprar). */
export function StatusTab({ items, sections, today }: StatusTabProps) {
  const [onlyCritical, setOnlyCritical] = useState(false);
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
          <table className="table">
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
                <StatusRow key={item.supplyId} item={item} today={today} />
              )}
            />
          </table>
        </div>
      </div>
    </div>
  );
}
