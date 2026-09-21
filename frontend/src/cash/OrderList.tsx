import { EmptyState } from '../components/EmptyState';
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
    return (
      <EmptyState
        title="Nenhum pedido hoje"
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
              <th>Tipo</th>
              <th>Pagamento</th>
              <th>Bairro</th>
              <th className="num">Taxa</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {day.orders.map((order) => {
              const { method, neighborhood } = describeOrder(order, day);
              return (
                <tr key={order.id}>
                  <td className="num strong">{formatMoney(order.amount)}</td>
                  <td>
                    <span className="tag" data-kind={order.type}>
                      {TYPE_LABEL[order.type]}
                    </span>
                  </td>
                  <td>{method}</td>
                  <td>{neighborhood}</td>
                  <td className="num">
                    {order.type === 'DELIVERY'
                      ? formatMoney(order.deliveryFee)
                      : '—'}
                  </td>
                  <td className="row-actions">
                    {!locked && (
                      <>
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => onEdit(order)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button-ghost"
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
    </div>
  );
}
