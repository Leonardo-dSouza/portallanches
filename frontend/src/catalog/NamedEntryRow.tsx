import { useState, type ReactNode } from 'react';
import { EntryActions } from './EntryActions';
import { InactiveTag } from './InactiveTag';
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
  /** Motivo para não renomear (ex.: categoria que vem da planilha). */
  editLockedReason?: string;
  /** Marca ao lado do nome (ex.: o ícone da maquininha). */
  badge?: ReactNode;
  /** Célula antes do nome (ex.: a tecla da forma de pagamento no caixa). */
  leadingCell?: ReactNode;
  /** Célula extra antes das ações (ex.: subir/descer a categoria). */
  orderControls?: ReactNode;
  /** Células extras depois da situação (ex.: os adicionais da categoria). */
  extraCells?: ReactNode;
}

/** Linha de cadastro que só tem nome e situação (tipos de gasto, formas de pagamento, categorias). */
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
      {props.leadingCell}
      <td>
        {editing ? (
          <input
            className="cell-input"
            aria-label={`${fieldLabel} ${entry.name}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : (
          <>
            {entry.name}
            {props.badge}
            <InactiveTag active={entry.active} />
          </>
        )}
      </td>
      {props.extraCells}
      {props.orderControls && <td>{props.orderControls}</td>}
      <td className="row-actions">
        <EntryActions
          name={entry.name}
          editing={editing}
          active={entry.active}
          busy={busy}
          lockedReason={entry.active ? props.lockedReason : undefined}
          editLockedReason={props.editLockedReason}
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
