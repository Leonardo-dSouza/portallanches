import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { Order } from '../api/types';
import { OrderDetails } from './OrderDetails';
import { OrderRow } from './OrderRow';
import type { CashDay } from './use-cash-day';

interface OrderListProps {
  cash: CashApi;
  day: CashDay;
  locked: boolean;
  onEdit(order: Order): void;
  onChanged(): void;
}

export function OrderList({
  cash,
  day,
  locked,
  onEdit,
  onChanged,
}: OrderListProps) {
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const editFromDetails = (order: Order) => {
    setViewing(null);
    onEdit(order);
  };
  const remove = async (order: Order) => {
    try {
      await cash.deleteOrder(order.id);
      setError(null);
      onChanged();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };
  if (day.orders.length === 0)
    return (
      <EmptyState
        title="Nenhum pedido neste dia"
        hint="Use o formulário ao lado para lançar o primeiro."
      />
    );
  return (
    <div className="card card-flush">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th className="num">Valor</th>
              <th>Itens</th>
              <th>Tipo e pagamento</th>
              <th>Cliente</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {day.orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                day={day}
                locked={locked}
                onOpen={setViewing}
                onEdit={onEdit}
                onRemove={(o) => void remove(o)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {viewing && (
        <OrderDetails
          order={viewing}
          day={day}
          locked={locked}
          onEdit={editFromDetails}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
