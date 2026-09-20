import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { useState } from 'react';
import type { CashDay } from './use-cash-day';

interface OrderListProps {
  cash: CashApi;
  day: CashDay;
  locked: boolean;
  onEdit(order: Order): void;
  onChanged(): void;
}

const TYPE_LABEL = { COUNTER: 'Balcão', DELIVERY: 'Entrega' } as const;

function describeOrder(order: Order, day: CashDay) {
  const method = day.paymentMethods.find((m) => m.id === order.paymentMethodId);
  const zone = day.zones.find((z) => z.id === order.deliveryZoneId);
  return {
    method: method?.name ?? '—',
    neighborhood: zone?.neighborhood ?? '—',
  };
}

export function OrderList({
  cash,
  day,
  locked,
  onEdit,
  onChanged,
}: OrderListProps) {
  const [error, setError] = useState<string | null>(null);
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
    return <p className="page-message">Nenhum pedido hoje.</p>;
  return (
    <div className="card">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Valor</th>
            <th>Tipo</th>
            <th>Pagamento</th>
            <th>Bairro</th>
            <th>Taxa</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {day.orders.map((order) => {
            const { method, neighborhood } = describeOrder(order, day);
            return (
              <tr key={order.id}>
                <td>{formatMoney(order.amount)}</td>
                <td>{TYPE_LABEL[order.type]}</td>
                <td>{method}</td>
                <td>{neighborhood}</td>
                <td>
                  {order.type === 'DELIVERY'
                    ? formatMoney(order.deliveryFee)
                    : '—'}
                </td>
                <td className="row-actions">
                  {!locked && (
                    <>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => onEdit(order)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => void remove(order)}
                      >
                        Apagar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
