import { useRef, useState } from 'react';
import { TextField } from '../components/TextField';
import { parseEntryName } from './catalog-values';
import { NewEntryForm } from './NewEntryForm';
import { useRowAction, type RowContext } from './use-row-action';

interface NewNameFormProps {
  title: string;
  fieldLabel: string;
  submitLabel: string;
  /** Para a mensagem de nome vazio ("nome do tipo de gasto"). */
  what: string;
  context: RowContext;
  create(name: string): Promise<unknown>;
}

/** Cadastro rápido de algo que só tem nome; limpa e devolve o foco ao campo depois de salvar. */
export function NewNameForm(props: NewNameFormProps) {
  const { context, create } = props;
  const [name, setName] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const { busy, run } = useRowAction(context);
  const submit = async () => {
    const parsed = parseEntryName(name, `nome ${props.what}`);
    if (!parsed.ok) return context.onError(parsed.error);
    if (!(await run(() => create(parsed.value)))) return;
    setName('');
    nameRef.current?.focus();
  };
  return (
    <NewEntryForm
      title={props.title}
      submitLabel={props.submitLabel}
      busy={busy}
      onSubmit={() => void submit()}
    >
      <TextField
        label={props.fieldLabel}
        ref={nameRef}
        value={name}
        onChange={setName}
      />
    </NewEntryForm>
  );
}
