import { Check, Plus } from 'lucide-react';
import { useMemo, useRef, type FormEvent } from 'react';
import { useApi } from '../api/api-context';
import type { CashApi } from '../api/cash-api';
import { createInvoiceApi } from '../api/invoice-api';
import type { InvoicePreview } from '../api/invoice-types';

import type { Expense } from '../api/types';
import { TextField } from '../components/TextField';
import type { OutsideMarks } from '../purchases/outside-items';
import {
  amountHint,
  invoiceCardOf,
  invoiceFields,
  outsideCentsOf,
} from './expense-invoice-draft';
import { ExpenseInvoiceSection } from './ExpenseInvoiceSection';
import type { CashDay } from './use-cash-day';
import { useExpenseForm } from './use-expense-form';
import { useInvoiceReader } from './use-invoice-reader';

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
  const amountRef = useRef<HTMLInputElement>(null);
  const api = useApi();
  const invoices = useMemo(() => createInvoiceApi(api), [api]);
  const form = useExpenseForm({
    focusRef: typeRef,
    cash,
    types: day.expenseTypes,
    editing,
    onSaved,
  });
  const onInvoiceRead = (preview: InvoicePreview) => {
    form.fillFromInvoice(preview);
    // Lida a nota, o caixa confere o valor e o Enter já salva.
    amountRef.current?.focus();
  };
  const reader = useInvoiceReader({ invoices, editing, onRead: onInvoiceRead });
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (reader.blockUnreadCode()) return;
    if (await form.submit(invoiceFields(reader.draft))) reader.reset();
  };
  // Marcar um item de fora tira o total dele do Valor; desmarcar devolve (2026-10-25).
  const changeOutside = (marks: OutsideMarks) => {
    form.shiftAmount(outsideCentsOf(reader.draft) - marks.cents);
    reader.setOutside(marks);
  };
  const card = invoiceCardOf(reader.draft);
  const hint = card && amountHint(card, form.values.amount);
  return (
    <form className="card order-form" onSubmit={(e) => void handleSubmit(e)}>
      <h2>{editing ? `Editar gasto #${editing.id}` : 'Novo gasto'}</h2>
      <ExpenseInvoiceSection reader={reader} onOutsideChange={changeOutside} />
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
        ref={amountRef}
        value={form.values.amount}
        onChange={(value) => form.setField('amount', value)}
      />
      {hint && <p className="hint">{hint}</p>}
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
      <button
        className="button"
        type="submit"
        disabled={form.saving}
        aria-busy={form.saving}
      >
        {editing ? <Check aria-hidden /> : <Plus aria-hidden />}
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
