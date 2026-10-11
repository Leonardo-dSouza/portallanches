import { Check, Eye, EyeOff, Lock, Pencil } from 'lucide-react';
interface EntryActionsProps {
  name: string;
  editing: boolean;
  active: boolean;
  busy: boolean;
  onEdit(): void;
  onSave(): void;
  onCancel(): void;
  onToggleActive(): void;
  /** Motivo para o botão de desativar ficar bloqueado (aparece como dica). */
  lockedReason?: string;
  /** Motivo para não renomear: no lugar do Editar, um cadeado com o motivo. */
  editLockedReason?: string;
}

/**
 * Cadeado no lugar do "Editar" cinza (2026-10-11: o botão apagado parecia quebrado). O motivo
 * fica na dica e no texto para o leitor de tela.
 */
function EditLock({ reason }: { reason: string }) {
  return (
    <span className="tag entry-lock" title={reason}>
      <Lock aria-hidden />
      Da planilha
      <span className="sr-only">: {reason}</span>
    </span>
  );
}

function EditButton({ name, onEdit }: { name: string; onEdit(): void }) {
  return (
    <button
      type="button"
      className="button button-secondary button-sm"
      aria-label={`Editar ${name}`}
      onClick={onEdit}
    >
      <Pencil aria-hidden />
      Editar
    </button>
  );
}

function EditingActions(props: EntryActionsProps) {
  const { name, busy } = props;
  return (
    <>
      <button
        type="button"
        className="button button-sm"
        aria-label={`Salvar ${name}`}
        disabled={busy}
        aria-busy={busy}
        onClick={props.onSave}
      >
        <Check aria-hidden />
        Salvar
      </button>
      <button
        type="button"
        className="button-ghost button-sm"
        aria-label={`Cancelar edição de ${name}`}
        onClick={props.onCancel}
      >
        Cancelar
      </button>
    </>
  );
}

/**
 * Ações da linha; o nome entra no rótulo acessível para distinguir "Editar Uru" de
 * "Editar Centro". Editar é tecla; desativar é discreto e vermelho (ativar, neutro).
 */
export function EntryActions(props: EntryActionsProps) {
  const { name, editing, active, busy } = props;
  if (editing) return <EditingActions {...props} />;
  const toggle = active ? 'Desativar' : 'Ativar';
  const ToggleIcon = active ? EyeOff : Eye;
  return (
    <>
      {props.editLockedReason ? (
        <EditLock reason={props.editLockedReason} />
      ) : (
        <EditButton name={name} onEdit={props.onEdit} />
      )}
      <button
        type="button"
        className={`button-ghost button-sm ${active ? 'button-danger' : ''}`}
        aria-label={`${toggle} ${name}`}
        disabled={busy || props.lockedReason !== undefined}
        aria-busy={busy}
        title={props.lockedReason}
        onClick={props.onToggleActive}
      >
        <ToggleIcon aria-hidden />
        {toggle}
      </button>
    </>
  );
}
