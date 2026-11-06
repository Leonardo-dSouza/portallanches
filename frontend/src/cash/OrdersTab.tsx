import { useRef, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Order } from '../api/types';
import { ClosedNotice } from './ClosedNotice';
import { OrderForm } from './OrderForm';
import { OrderList } from './OrderList';
import type { CashDay } from './use-cash-day';

interface TabProps {
  cash: CashApi;
  day: CashDay;
  onChanged(): void;
}

export function OrdersTab({ cash, day, onChanged }: TabProps) {
  const [editing, setEditing] = useState<Order | null>(null);
  const locked = day.closing.status === 'CLOSED';
  // No celular (2026-11-05): após salvar, a comanda rola até a lista de pedidos.
  const orderListRef = useRef<HTMLElement>(null);
  const saved = () => {
    setEditing(null);
    onChanged();
  };
  return (
    <div className="cash-grid">
      {locked ? (
        <ClosedNotice
          what="pedidos"
          closing={day.closing}
          onReopened={onChanged}
        />
      ) : (
        <OrderForm
          key={editing?.id ?? 'novo'}
          cash={cash}
          day={day}
          editing={editing}
          onSaved={saved}
          onCancelEdit={() => setEditing(null)}
          orderListRef={orderListRef}
        />
      )}
      <OrderList
        cash={cash}
        day={day}
        locked={locked}
        editingId={editing?.id ?? null}
        onEdit={setEditing}
        onChanged={onChanged}
        sectionRef={orderListRef}
      />
    </div>
  );
}
