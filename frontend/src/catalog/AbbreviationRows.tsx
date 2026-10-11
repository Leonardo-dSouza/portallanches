import { Plus, X } from 'lucide-react';
import { TextField } from '../components/TextField';
import type { TicketFormState } from './use-ticket-form';

function AbbreviationRow({
  form,
  index,
}: {
  form: TicketFormState;
  index: number;
}) {
  const row = form.rows[index];
  const position = index + 1;
  return (
    <div className="package-row abbreviation-row">
      <TextField
        label={`Texto ${position}`}
        maxLength={40}
        value={row.from}
        onChange={(value) => form.setRow(index, 'from', value)}
      />
      <TextField
        label={`Abreviação ${position}`}
        maxLength={20}
        value={row.to}
        onChange={(value) => form.setRow(index, 'to', value)}
      />
      <button
        type="button"
        className="button-ghost button-danger"
        aria-label={`Remover abreviação ${position}`}
        onClick={() => form.removeRow(index)}
      >
        <X aria-hidden />
      </button>
    </div>
  );
}

/** Lista "texto → abreviação" da comanda impressa (pedido do usuário, 2026-10-11). */
export function AbbreviationRows({ form }: { form: TicketFormState }) {
  return (
    <fieldset className="package-rows">
      <legend>Abreviações da comanda impressa</legend>
      <p className="hint">
        Troca a palavra inteira, com maiúscula ou não. Abreviação vazia apaga a
        palavra (por exemplo, o “X” dos lanches). A tela continua com o nome
        inteiro.
      </p>
      {form.rows.map((_, index) => (
        <AbbreviationRow key={index} form={form} index={index} />
      ))}
      <button type="button" className="button-ghost" onClick={form.addRow}>
        <Plus aria-hidden />
        Adicionar abreviação
      </button>
    </fieldset>
  );
}
