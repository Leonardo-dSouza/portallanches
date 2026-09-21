import { useRef, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { CatalogAdminApi } from '../api/catalog-admin-api';
import { formatMoney } from '../api/money';
import type { DeliveryZone } from '../api/types';
import { TextField } from '../components/TextField';
import { feeForEditing, parseEntryName, parseZoneFee } from './catalog-values';
import { CatalogTab } from './CatalogTab';
import { EntryActions } from './EntryActions';
import { NewEntryForm } from './NewEntryForm';
import { useCatalogList } from './use-catalog-list';
import { useRowAction, type RowContext } from './use-row-action';

function NewZoneForm({
  cash,
  context,
}: {
  cash: CashApi;
  context: RowContext;
}) {
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const { busy, run } = useRowAction(context);
  const submit = async () => {
    const parsedName = parseEntryName(name, 'nome do bairro');
    const parsedFee = parseZoneFee(fee);
    if (!parsedName.ok) return context.onError(parsedName.error);
    if (!parsedFee.ok) return context.onError(parsedFee.error);
    const created = await run(() =>
      cash.createDeliveryZone(parsedName.value, parsedFee.value),
    );
    if (!created) return;
    setName('');
    setFee('');
    nameRef.current?.focus();
  };
  return (
    <NewEntryForm
      title="Novo bairro"
      submitLabel="Adicionar bairro"
      busy={busy}
      onSubmit={() => void submit()}
    >
      <TextField
        label="Nome do bairro"
        ref={nameRef}
        value={name}
        onChange={setName}
      />
      <TextField
        label="Taxa padrão"
        inputMode="decimal"
        value={fee}
        onChange={setFee}
      />
    </NewEntryForm>
  );
}

function ZoneCells({
  zone,
  editing,
  values,
}: {
  zone: DeliveryZone;
  editing: boolean;
  values: {
    name: string;
    fee: string;
    setName(v: string): void;
    setFee(v: string): void;
  };
}) {
  if (!editing)
    return (
      <>
        <td>{zone.neighborhood}</td>
        <td className="num">{formatMoney(zone.fee)}</td>
      </>
    );
  return (
    <>
      <td>
        <input
          className="cell-input"
          aria-label={`Nome do bairro ${zone.neighborhood}`}
          value={values.name}
          onChange={(event) => values.setName(event.target.value)}
        />
      </td>
      <td className="num">
        <input
          className="cell-input cell-input-short"
          inputMode="decimal"
          aria-label={`Taxa de ${zone.neighborhood}`}
          value={values.fee}
          onChange={(event) => values.setFee(event.target.value)}
        />
      </td>
    </>
  );
}

function ZoneRow({
  zone,
  admin,
  context,
}: {
  zone: DeliveryZone;
  admin: CatalogAdminApi;
  context: RowContext;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(zone.neighborhood);
  const [fee, setFee] = useState(feeForEditing(zone.fee));
  const { busy, run } = useRowAction(context);
  const save = async () => {
    const parsedName = parseEntryName(name, 'nome do bairro');
    const parsedFee = parseZoneFee(fee);
    if (!parsedName.ok) return context.onError(parsedName.error);
    if (!parsedFee.ok) return context.onError(parsedFee.error);
    const update = {
      neighborhood: parsedName.value,
      fee: parsedFee.value,
      active: zone.active,
    };
    if (await run(() => admin.updateDeliveryZone(zone.id, update)))
      setEditing(false);
  };
  const startEditing = () => {
    setName(zone.neighborhood);
    setFee(feeForEditing(zone.fee));
    setEditing(true);
  };
  const toggleActive = () =>
    run(() =>
      admin.updateDeliveryZone(zone.id, {
        neighborhood: zone.neighborhood,
        fee: zone.fee,
        active: !zone.active,
      }),
    );
  return (
    <tr data-inactive={!zone.active}>
      <ZoneCells
        zone={zone}
        editing={editing}
        values={{ name, fee, setName, setFee }}
      />
      <td>
        <span className="tag" data-status={zone.active ? 'OPEN' : 'CLOSED'}>
          {zone.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="row-actions">
        <EntryActions
          name={zone.neighborhood}
          editing={editing}
          active={zone.active}
          busy={busy}
          onEdit={startEditing}
          onSave={() => void save()}
          onCancel={() => setEditing(false)}
          onToggleActive={() => void toggleActive()}
        />
      </td>
    </tr>
  );
}

export function ZonesTab({
  cash,
  admin,
}: {
  cash: CashApi;
  admin: CatalogAdminApi;
}) {
  const list = useCatalogList(cash.listDeliveryZones);
  return (
    <CatalogTab
      noun="bairros"
      hint="Alterar a taxa vale para os próximos pedidos (pedidos antigos guardam a taxa que tinham). Renomear muda o nome também nos pedidos antigos."
      list={list}
      labelOf={(zone) => zone.neighborhood}
      columns={
        <>
          <th>Bairro</th>
          <th className="num">Taxa padrão</th>
          <th>Situação</th>
          <th />
        </>
      }
      renderForm={(context) => <NewZoneForm cash={cash} context={context} />}
      renderRow={(zone, context) => (
        <ZoneRow key={zone.id} zone={zone} admin={admin} context={context} />
      )}
    />
  );
}
