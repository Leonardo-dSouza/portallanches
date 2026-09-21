import { useState } from 'react';
import { EntryActions } from './EntryActions';
import { parseEntryName } from './catalog-values';
import { useRowAction, type RowContext } from './use-row-action';

export interface NamedEntry {
  id: number;
  name: string;
  active: boolean;
}

interface NamedEntryRowProps {
  entry: NamedEntry;
  /** Texto para mensagens e rótulos: "tipo de gasto", "forma de pagamento". */
  what: string;
  /** Prefixo do rótulo do campo em edição ("Nome do tipo" → "Nome do tipo Gás"). */
  fieldLabel: string;
  context: RowContext;
  save(next: { name: string; active: boolean }): Promise<unknown>;
  lockedReason?: string;
}

/** Linha de cadastro que só tem nome e situação (tipos de gasto, formas de pagamento). */
export function NamedEntryRow(props: NamedEntryRowProps) {
  const { entry, what, fieldLabel, context, save } = props;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(entry.name);
  const { busy, run } = useRowAction(context);
  const saveName = async () => {
    const parsed = parseEntryName(name, `nome da ${what}`);
    if (!parsed.ok) return context.onError(parsed.error);
    if (await run(() => save({ name: parsed.value, active: entry.active })))
      setEditing(false);
  };
  return (
    <tr data-inactive={!entry.active}>
      <td>
        {editing ? (
          <input
            className="cell-input"
            aria-label={`${fieldLabel} ${entry.name}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : (
          entry.name
        )}
      </td>
      <td>
        <span className="tag" data-status={entry.active ? 'OPEN' : 'CLOSED'}>
          {entry.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="row-actions">
        <EntryActions
          name={entry.name}
          editing={editing}
          active={entry.active}
          busy={busy}
          lockedReason={entry.active ? props.lockedReason : undefined}
          onEdit={() => {
            setName(entry.name);
            setEditing(true);
          }}
          onSave={() => void saveName()}
          onCancel={() => setEditing(false)}
          onToggleActive={() =>
            void run(() => save({ name: entry.name, active: !entry.active }))
          }
        />
      </td>
    </tr>
  );
}
