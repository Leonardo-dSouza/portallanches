import type { Order } from '../api/types';
import { elapsedLabel, showsElapsed } from './order-status-view';
import { StatusTrack } from './StatusTrack';

interface OrderStatusCellProps {
  order: Order;
  /** Hora atual (renovada pela lista): o "há 12 min". */
  now: Date;
}

/**
 * Andamento do pedido na lista: só mostra a trilha e há quanto tempo está na etapa. Mudar o
 * status é no pop-up do pedido (2026-10-16: como a tela do pedido do Consumer; um clique solto
 * na lista mudava sem querer).
 */
export function OrderStatusCell({ order, now }: OrderStatusCellProps) {
  if (order.type === null) return <td>—</td>;
  if (order.canceledAt)
    return (
      <td className="order-status-cell">
        <span className="tag" data-kind="CANCELED">
          Cancelado
        </span>
      </td>
    );
  return (
    <td className="order-status-cell">
      <StatusTrack order={order} type={order.type} />
      {showsElapsed(order) && (
        <span className="status-since">
          {elapsedLabel(order.statusChangedAt, now)}
        </span>
      )}
    </td>
  );
}
