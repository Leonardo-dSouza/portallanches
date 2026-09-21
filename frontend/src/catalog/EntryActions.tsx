interface EntryActionsProps {
  name: string;
  editing: boolean;
  active: boolean;
  busy: boolean;
  onEdit(): void;
  onSave(): void;
  onCancel(): void;
  onToggleActive(): void;
}

/** Ações da linha; o nome entra no rótulo acessível para distinguir "Editar Uru" de "Editar Centro". */
export function EntryActions(props: EntryActionsProps) {
  const { name, editing, active, busy } = props;
  if (editing)
    return (
      <>
        <button
          type="button"
          className="button-ghost"
          aria-label={`Salvar ${name}`}
          disabled={busy}
          aria-busy={busy}
          onClick={props.onSave}
        >
          Salvar
        </button>
        <button
          type="button"
          className="button-ghost"
          aria-label={`Cancelar edição de ${name}`}
          onClick={props.onCancel}
        >
          Cancelar
        </button>
      </>
    );
  const toggle = active ? 'Desativar' : 'Ativar';
  return (
    <>
      <button
        type="button"
        className="button-ghost"
        aria-label={`Editar ${name}`}
        onClick={props.onEdit}
      >
        Editar
      </button>
      <button
        type="button"
        className={`button-ghost ${active ? 'button-danger' : ''}`}
        aria-label={`${toggle} ${name}`}
        disabled={busy}
        aria-busy={busy}
        onClick={props.onToggleActive}
      >
        {toggle}
      </button>
    </>
  );
}
