import { useState } from 'react';
import { formatQuantity } from '../api/quantity';
import type { SupplyApi } from '../api/supply-api';
import type { Supply } from '../api/types';
import { CatalogTab } from './CatalogTab';
import { EntryActions } from './EntryActions';
import { SupplyForm } from './SupplyForm';
import { describePackages, describeUnitCost } from './supply-form-values';
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
      <td className="strong">{supply.name}</td>
      <td>{supply.countUnit}</td>
      <td>{describePackages(supply)}</td>
      <td className="num">
        {supply.minStock === null
          ? '—'
          : `${formatQuantity(supply.minStock)} ${supply.countUnit}`}
      </td>
      <td className="num">{describeUnitCost(supply)}</td>
      <td>{supply.deductOnSale ? 'Sim' : 'Não'}</td>
      <td>
        <span className="tag" data-status={supply.active ? 'OPEN' : 'CLOSED'}>
          {supply.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
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

/** Insumos do estoque: o formulário do topo cadastra ou, após "Editar", altera o escolhido. */
export function SuppliesTab({ supplies }: { supplies: SupplyApi }) {
  const list = useCatalogList(supplies.listSupplies);
  const [editing, setEditing] = useState<Supply | null>(null);
  return (
    <CatalogTab
      noun="insumos"
      hint="O estoque é contado sempre na unidade de contagem; as embalagens convertem compras (1 fardo = 6 un). Estoque mínimo em branco = sem alerta de baixa. O custo por unidade de contagem é a base do CMV dos lanches."
      list={list}
      labelOf={(supply) => supply.name}
      columns={
        <>
          <th>Insumo</th>
          <th>Contagem</th>
          <th>Embalagens</th>
          <th className="num">Mínimo</th>
          <th className="num">Custo</th>
          <th>Baixa na venda</th>
          <th>Situação</th>
          <th />
        </>
      }
      renderForm={(context) => (
        <SupplyForm
          key={editing?.id ?? 'novo'}
          supplies={supplies}
          editing={editing}
          context={context}
          onDone={() => setEditing(null)}
        />
      )}
      renderRow={(supply, context) => (
        <SupplyRow
          key={supply.id}
          supply={supply}
          supplies={supplies}
          context={context}
          onEdit={setEditing}
        />
      )}
    />
  );
}
