import type { FormEvent, ReactNode } from 'react';

interface NewEntryFormProps {
  title: string;
  submitLabel: string;
  busy: boolean;
  onSubmit(): void;
  children: ReactNode;
}

/** Faixa de cadastro rápido no topo da tabela: campos lado a lado e um botão. */
export function NewEntryForm(props: NewEntryFormProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    props.onSubmit();
  };
  return (
    <form className="card new-entry" onSubmit={submit}>
      <h2>{props.title}</h2>
      <div className="new-entry-fields">{props.children}</div>
      <button
        type="submit"
        className="button"
        disabled={props.busy}
        aria-busy={props.busy}
      >
        {props.submitLabel}
      </button>
    </form>
  );
}
