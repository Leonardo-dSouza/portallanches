import { useRef, type FormEvent } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Expense } from '../api/types';
import { TextField } from '../components/TextField';
import type { CashDay } from './use-cash-day';
import { useExpenseForm } from './use-expense-form';

interface ExpenseFormProps {
  cash: CashApi;
  day: CashDay;
  editing: Expense | null;
  onSaved(): void;
  onCancelEdit(): void;
}

export function ExpenseForm({
  cash,
  day,
  editing,
  onSaved,
  onCancelEdit,
}: ExpenseFormProps) {
  const typeRef = useRef<HTMLInputElement>(null);
  const form = useExpenseForm({
    focusRef: typeRef,
    cash,
    types: day.expenseTypes,
    editing,
    onSaved,
  });
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void form.submit();
  };
  return (
    <form className="card order-form" onSubmit={handleSubmit}>
      <h2>{editing ? `Editar gasto #${editing.id}` : 'Novo gasto'}</h2>
      <TextField
        label="Tipo"
        list="expense-types"
        ref={typeRef}
        value={form.values.typeName}
        onChange={(value) => form.setField('typeName', value)}
      />
      <datalist id="expense-types">
        {day.expenseTypes
          .filter((t) => t.active)
          .map((type) => (
            <option key={type.id} value={type.name} />
          ))}
      </datalist>
      {form.newTypeName && (
        <p className="hint">Tipo novo: "{form.newTypeName}" será cadastrado.</p>
      )}
      <TextField
        label="Valor"
        inputMode="decimal"
        value={form.values.amount}
        onChange={(value) => form.setField('amount', value)}
      />
      <TextField
        label="Observação (opcional)"
        value={form.values.description}
        onChange={(value) => form.setField('description', value)}
      />
      {form.error && (
        <p className="form-error" role="alert">
          {form.error}
        </p>
      )}
      <button className="button" type="submit" disabled={form.saving}>
        {editing ? 'Salvar alterações' : 'Adicionar gasto'}
      </button>
      {editing && (
        <button
          className="button button-secondary"
          type="button"
          onClick={onCancelEdit}
        >
          Cancelar edição
        </button>
      )}
    </form>
  );
}
