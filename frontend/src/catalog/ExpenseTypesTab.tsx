import { useRef, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { CatalogAdminApi } from '../api/catalog-admin-api';
import type { ExpenseType } from '../api/types';
import { TextField } from '../components/TextField';
import { parseEntryName } from './catalog-values';
import { CatalogTab } from './CatalogTab';
import { EntryActions } from './EntryActions';
import { NewEntryForm } from './NewEntryForm';
import { useCatalogList } from './use-catalog-list';
import { useRowAction, type RowContext } from './use-row-action';

interface ExpenseTypesTabProps {
  cash: CashApi;
  admin: CatalogAdminApi;
}

function NewTypeForm({
  cash,
  context,
}: {
  cash: CashApi;
  context: RowContext;
}) {
  const [name, setName] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const { busy, run } = useRowAction(context);
  const submit = async () => {
    const parsed = parseEntryName(name, 'nome do tipo de gasto');
    if (!parsed.ok) return context.onError(parsed.error);
    if (await run(() => cash.createExpenseType(parsed.value))) {
      setName('');
      nameRef.current?.focus();
    }
  };
  return (
    <NewEntryForm
      title="Novo tipo de gasto"
      submitLabel="Adicionar tipo"
      busy={busy}
      onSubmit={() => void submit()}
    >
      <TextField
        label="Nome do tipo"
        ref={nameRef}
        value={name}
        onChange={setName}
      />
    </NewEntryForm>
  );
}

function ExpenseTypeRow({
  type,
  admin,
  context,
}: {
  type: ExpenseType;
  admin: CatalogAdminApi;
  context: RowContext;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const { busy, run } = useRowAction(context);
  const save = async () => {
    const parsed = parseEntryName(name, 'nome do tipo de gasto');
    if (!parsed.ok) return context.onError(parsed.error);
    const update = { name: parsed.value, active: type.active };
    if (await run(() => admin.updateExpenseType(type.id, update)))
      setEditing(false);
  };
  return (
    <tr data-inactive={!type.active}>
      <td>
        {editing ? (
          <input
            className="cell-input"
            aria-label={`Nome do tipo ${type.name}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : (
          type.name
        )}
      </td>
      <td>
        <span className="tag" data-status={type.active ? 'OPEN' : 'CLOSED'}>
          {type.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="row-actions">
        <EntryActions
          name={type.name}
          editing={editing}
          active={type.active}
          busy={busy}
          onEdit={() => {
            setName(type.name);
            setEditing(true);
          }}
          onSave={() => void save()}
          onCancel={() => setEditing(false)}
          onToggleActive={() =>
            void run(() =>
              admin.updateExpenseType(type.id, {
                name: type.name,
                active: !type.active,
              }),
            )
          }
        />
      </td>
    </tr>
  );
}

export function ExpenseTypesTab({ cash, admin }: ExpenseTypesTabProps) {
  const list = useCatalogList(cash.listExpenseTypes);
  return (
    <CatalogTab
      noun="tipos de gasto"
      hint="Renomear muda o nome também nos gastos antigos. Desativar só tira o tipo da lista do caixa."
      list={list}
      labelOf={(type) => type.name}
      columns={
        <>
          <th>Tipo</th>
          <th>Situação</th>
          <th />
        </>
      }
      renderForm={(context) => <NewTypeForm cash={cash} context={context} />}
      renderRow={(type, context) => (
        <ExpenseTypeRow
          key={type.id}
          type={type}
          admin={admin}
          context={context}
        />
      )}
    />
  );
}
