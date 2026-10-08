import { Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { useState } from 'react';
import { describeItems } from './order-lines';
import { describePayment } from './payment-choice';
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
    method: describePayment(method, order.paymentMode),
    neighborhood: zone?.neighborhood ?? '—',
  };
}

interface OrderRowProps {
  order: Order;
  day: CashDay;
  locked: boolean;
  onEdit(order: Order): void;
  onRemove(order: Order): void;
}

/**
 * Valor com a taxa embaixo, tipo com o pagamento embaixo e cliente com o bairro embaixo:
 * a lista cabe ao lado da comanda larga, e os itens ocupam o que sobra.
 */
function OrderRow({ order, day, locked, onEdit, onRemove }: OrderRowProps) {
  const { method, neighborhood } = describeOrder(order, day);
  const isDelivery = order.type === 'DELIVERY';
  const items = describeItems(order.items);
  return (
    <tr>
      <td className="num strong">
        {formatMoney(order.amount)}
        {isDelivery && order.deliveryFee && (
          <span className="cell-sub">
            taxa {formatMoney(order.deliveryFee)}
          </span>
        )}
      </td>
      <td className="order-items-cell" title={items}>
        <span>{items || '—'}</span>
      </td>
      <td>
        {order.type ? (
          <span className="tag" data-kind={order.type}>
            {TYPE_LABEL[order.type]}
          </span>
        ) : (
          '—'
        )}
        <span className="cell-sub">{method}</span>
      </td>
      <td>
        {order.customerName ?? '—'}
        {isDelivery && <span className="cell-sub">{neighborhood}</span>}
      </td>
      <td className="row-actions">
        {!locked && (
          <>
            {/* Só ícone (com nome e dica): a lista divide a tela com a comanda larga. */}
            <button
              type="button"
              className="button button-secondary button-sm"
              aria-label="Editar"
              title="Editar pedido"
              onClick={() => onEdit(order)}
            >
              <Pencil aria-hidden />
            </button>
            <button
              type="button"
              className="button-ghost button-sm button-danger"
              aria-label="Apagar"
              title="Apagar pedido"
              onClick={() => onRemove(order)}
            >
              <Trash2 aria-hidden />
            </button>
          </>
        )}
      </td>
    </tr>
  );
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
                onEdit={onEdit}
                onRemove={(o) => void remove(o)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
