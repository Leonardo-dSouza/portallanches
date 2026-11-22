import { KeyRound } from 'lucide-react';
import { useRef, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { CatalogAdminApi, ZoneUpdate } from '../api/catalog-admin-api';
import { formatMoney } from '../api/money';
import type { DeliveryZone } from '../api/types';
import { TextField } from '../components/TextField';
import { feeForEditing, parseEntryName, parseZoneFee } from './catalog-values';
import type { SettingsApi } from '../api/settings-api';
import { CatalogTab } from './CatalogTab';
import { DeliveryCodeMessagesForm } from './DeliveryCodeMessagesForm';
import { EntryActions } from './EntryActions';
import { InactiveTag } from './InactiveTag';
import { NewEntryForm } from './NewEntryForm';
import { useCatalogList, type CatalogList } from './use-catalog-list';
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
        <td>
          {zone.neighborhood}
          <InactiveTag active={zone.active} />
        </td>
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

/** O bairro como está, para o PUT que muda um campo só (o PUT pede todos). */
function zoneUpdateOf(zone: DeliveryZone): ZoneUpdate {
  return {
    neighborhood: zone.neighborhood,
    fee: zone.fee,
    active: zone.active,
    requiresDeliveryCode: zone.requiresDeliveryCode,
  };
}

/**
 * Liga/desliga do código de entrega (2026-11-21), na pílula do "Mostrar" do Cardápio: ligado
 * fica mostarda, para ver de relance os bairros com código.
 */
function ZoneCodeSwitch({
  zone,
  busy,
  onToggle,
}: {
  zone: DeliveryZone;
  busy: boolean;
  onToggle(): void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={zone.requiresDeliveryCode}
      aria-label={`Código de entrega em ${zone.neighborhood}`}
      className="menu-switch"
      disabled={busy}
      onClick={onToggle}
    >
      <KeyRound aria-hidden />
      {zone.requiresDeliveryCode ? 'Ligado' : 'Desligado'}
      <span className="menu-switch-track" aria-hidden />
    </button>
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
      ...zoneUpdateOf(zone),
      neighborhood: parsedName.value,
      fee: parsedFee.value,
    };
    if (await run(() => admin.updateDeliveryZone(zone.id, update)))
      setEditing(false);
  };
  const startEditing = () => {
    setName(zone.neighborhood);
    setFee(feeForEditing(zone.fee));
    setEditing(true);
  };
  const change = (fields: Partial<ZoneUpdate>) =>
    run(() =>
      admin.updateDeliveryZone(zone.id, { ...zoneUpdateOf(zone), ...fields }),
    );
  const toggleActive = () => change({ active: !zone.active });
  const toggleCode = () =>
    change({ requiresDeliveryCode: !zone.requiresDeliveryCode });
  return (
    <tr data-inactive={!zone.active}>
      <ZoneCells
        zone={zone}
        editing={editing}
        values={{ name, fee, setName, setFee }}
      />
      <td>
        <ZoneCodeSwitch
          zone={zone}
          busy={busy}
          onToggle={() => void toggleCode()}
        />
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

/**
 * Cadastros → Entregas → Bairros: a taxa padrão, o código de entrega de cada bairro e, embaixo,
 * as mensagens que o caixa copia nos pedidos com código (2026-11-21).
 */
export function ZonesTab({
  cash,
  admin,
  settings,
}: {
  cash: CashApi;
  admin: CatalogAdminApi;
  settings: SettingsApi;
}) {
  const list = useCatalogList(cash.listDeliveryZones);
  return (
    <>
      <ZoneList cash={cash} admin={admin} list={list} />
      <DeliveryCodeMessagesForm settings={settings} />
    </>
  );
}

function ZoneList({
  cash,
  admin,
  list,
}: {
  cash: CashApi;
  admin: CatalogAdminApi;
  list: CatalogList<DeliveryZone>;
}) {
  return (
    <CatalogTab
      noun="bairros"
      hint="Alterar a taxa vale para os próximos pedidos (pedidos antigos guardam a taxa que tinham). Renomear muda o nome também nos pedidos antigos. Com o código de entrega ligado, a entrega para o bairro ganha 4 dígitos na comanda, e o motoboy só entrega a quem disser o código."
      list={list}
      labelOf={(zone) => zone.neighborhood}
      columns={
        <>
          <th>Bairro</th>
          <th className="num">Taxa padrão</th>
          <th>Código de entrega</th>
          <th />
        </>
      }
      newLabel="Novo bairro"
      renderForm={(context) => <NewZoneForm cash={cash} context={context} />}
      renderRow={(zone, context) => (
        <ZoneRow key={zone.id} zone={zone} admin={admin} context={context} />
      )}
    />
  );
}
