import { useState } from 'react';
import { formatQuantity } from '../api/quantity';
import type { SupplyApi } from '../api/supply-api';
import type { Supply, SupplySection } from '../api/types';
import { SectionedRows } from '../stock/SectionedRows';
import { SectionFilterBar } from '../stock/SectionFilterBar';
import {
  countBySection,
  EMPTY_SECTION_FILTER,
  filterBySection,
  groupBySection,
} from '../stock/supply-sections';
import { CatalogTab } from './CatalogTab';
import { EntryActions } from './EntryActions';
import { SupplyForm } from './SupplyForm';
import {
  describePackages,
  describeSalePrice,
  describeUnitCost,
} from './supply-form-values';
import { useCatalogList } from './use-catalog-list';
import { useRowAction, type RowContext } from './use-row-action';

interface SupplyRowProps {
  supply: Supply;
  supplies: SupplyApi;
  context: RowContext;
  onEdit(supply: Supply): void;
}

function SupplyRow({ supply, supplies, context, onEdit }: SupplyRowProps) {
  const { busy, run } = useRowAction(context);
  const toggleActive = () =>
    run(() =>
      supplies.saveSupply(supply.id, { ...supply, active: !supply.active }),
    );
  return (
    <tr data-inactive={!supply.active}>
      <td className="strong">
        {supply.name}
        {/* Inativo só aparece com "Mostrar inativos": a marca fica no nome, sem coluna própria. */}
        {supply.dailyCount && supply.active && (
          <span className="tag supply-daily-tag">Diário</span>
        )}
        {!supply.active && (
          <span className="tag supply-inactive-tag" data-status="CLOSED">
            Inativo
          </span>
        )}
      </td>
      <td>{supply.countUnit}</td>
      <td className="supply-packages">{describePackages(supply)}</td>
      <td className="num">
        {supply.minStock === null
          ? '—'
          : `${formatQuantity(supply.minStock)} ${supply.countUnit}`}
      </td>
      <td className="num">{describeUnitCost(supply)}</td>
      <td className="num">{describeSalePrice(supply)}</td>
      <td>{supply.deductOnSale ? 'Sim' : 'Não'}</td>
      <td className="row-actions">
        <EntryActions
          name={supply.name}
          editing={false}
          active={supply.active}
          busy={busy}
          onEdit={() => onEdit(supply)}
          onSave={() => undefined}
          onCancel={() => undefined}
          onToggleActive={() => void toggleActive()}
        />
      </td>
    </tr>
  );
}

const COLUMN_COUNT = 8;

function useSupplySections(supplies: SupplyApi): SupplySection[] {
  // Sem seções (falha ao carregar) a lista continua utilizável, toda em "Sem seção".
  return useCatalogList(supplies.listSections).items ?? [];
}

/** Insumos do estoque: o formulário do topo cadastra ou, após "Editar", altera o escolhido. */
export function SuppliesTab({ supplies }: { supplies: SupplyApi }) {
  const list = useCatalogList(supplies.listSupplies);
  const sections = useSupplySections(supplies);
  const [filter, setFilter] = useState(EMPTY_SECTION_FILTER);
  const [editing, setEditing] = useState<Supply | null>(null);
  const renderRow = (supply: Supply, context: RowContext) => (
    <SupplyRow
      key={supply.id}
      supply={supply}
      supplies={supplies}
      context={context}
      onEdit={setEditing}
    />
  );
  return (
    <CatalogTab
      noun="insumos"
      hint="O estoque é contado sempre na unidade de contagem; as embalagens convertem compras (1 fardo = 6 un). Estoque mínimo em branco = sem alerta de baixa. O custo por unidade de contagem é a base do CMV dos lanches. Venda = preço do item do Cardápio que é o próprio insumo (bebidas, adicionais), editável aqui."
      list={list}
      labelOf={(supply) => supply.name}
      columns={
        <>
          <th>Insumo</th>
          <th>Contagem</th>
          <th>Embalagens</th>
          <th className="num">Mínimo</th>
          <th className="num">Custo</th>
          <th className="num">Venda</th>
          <th title="Baixa automática na venda">Baixa</th>
          <th />
        </>
      }
      toolbar={(shown) => (
        <SectionFilterBar
          sections={sections}
          filter={filter}
          counts={countBySection(shown, filter.query, sections)}
          onChange={setFilter}
        />
      )}
      narrow={(items) => filterBySection(items, filter, sections)}
      renderBody={(visible, context) => (
        <SectionedRows
          groups={groupBySection(visible, sections)}
          columnCount={COLUMN_COUNT}
          renderRow={(supply) => renderRow(supply, context)}
        />
      )}
      renderForm={(context) => (
        <SupplyForm
          key={editing?.id ?? 'novo'}
          supplies={supplies}
          editing={editing}
          sections={sections}
          context={context}
          onDone={() => setEditing(null)}
        />
      )}
      renderRow={renderRow}
    />
  );
}
