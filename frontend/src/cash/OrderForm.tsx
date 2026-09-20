import { useRef, type FormEvent } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Order } from '../api/types';
import { OrderFormFields } from './OrderFormFields';
import type { CashDay } from './use-cash-day';
import { useOrderForm } from './use-order-form';

interface OrderFormProps {
  cash: CashApi;
  day: CashDay;
  editing: Order | null;
  onSaved(): void;
  onCancelEdit(): void;
}

/** Formulário fixo ao lado da lista: o caixa lança vários pedidos em sequência. */
export function OrderForm({
  cash,
  day,
  editing,
  onSaved,
  onCancelEdit,
}: OrderFormProps) {
  const amountRef = useRef<HTMLInputElement>(null);
  const form = useOrderForm({
    cash,
    zones: day.zones,
    editing,
    onSaved,
    focusRef: amountRef,
  });
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void form.submit();
  };
  return (
    <form className="card order-form" onSubmit={handleSubmit}>
      <h2>{editing ? `Editar pedido #${editing.id}` : 'Novo pedido'}</h2>
      <OrderFormFields
        amountRef={amountRef}
        form={form}
        paymentMethods={day.paymentMethods}
        zones={day.zones}
      />
      {form.error && (
        <p className="form-error" role="alert">
          {form.error}
        </p>
      )}
      <button className="button" type="submit" disabled={form.saving}>
        {editing ? 'Salvar alterações' : 'Adicionar pedido'}
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
