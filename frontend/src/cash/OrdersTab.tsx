import { useRef, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Order } from '../api/types';
import { ClosedNotice } from './ClosedNotice';
import { cashGridClassName } from './cash-grid';
import { OrderForm } from './OrderForm';
import type { OrderFilter } from './order-filters';
import { OrderList } from './OrderList';
import type { CashDay } from './use-cash-day';

interface TabProps {
  cash: CashApi;
  day: CashDay;
  onChanged(): void;
  filter: OrderFilter;
  onFilterChange(filter: OrderFilter): void;
}

export function OrdersTab({
  cash,
  day,
  onChanged,
  filter,
  onFilterChange,
}: TabProps) {
  const [editing, setEditing] = useState<Order | null>(null);
  const [adding, setAdding] = useState<Order | null>(null);
  const locked = day.closing.status === 'CLOSED';
  // No celular (2026-11-05): após salvar, a comanda rola até a lista de pedidos.
  const orderListRef = useRef<HTMLElement>(null);
  const startEdit = (order: Order) => {
    setAdding(null);
    setEditing(order);
  };
  const startAdd = (order: Order) => {
    setEditing(null);
    setAdding(order);
  };
  const cancelForm = () => {
    setEditing(null);
    setAdding(null);
  };
  const saved = () => {
    setEditing(null);
    setAdding(null);
    onChanged();
  };
  const formKey = adding
    ? `add-${adding.id}`
    : editing
      ? `edit-${editing.id}`
      : 'novo';
  return (
    <div className={cashGridClassName(locked)}>
      {locked ? (
        <ClosedNotice
          what="pedidos"
          closing={day.closing}
          onReopened={onChanged}
        />
      ) : (
        <OrderForm
          key={formKey}
          cash={cash}
          day={day}
          editing={editing}
          adding={adding}
          onSaved={saved}
          onCancelEdit={cancelForm}
          orderListRef={orderListRef}
        />
      )}
      <OrderList
        cash={cash}
        day={day}
        locked={locked}
        editingId={adding?.id ?? editing?.id ?? null}
        onAdd={startAdd}
        onEdit={startEdit}
        onChanged={onChanged}
        sectionRef={orderListRef}
        filter={filter}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}
