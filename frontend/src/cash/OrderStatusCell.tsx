import { ChevronRight, Undo2 } from 'lucide-react';
import type { Order } from '../api/types';
import { canAdvance, canRevert, statusLabel } from './order-status-view';

interface OrderStatusCellProps {
  order: Order;
  /** Dia fechado: só mostra. */
  locked: boolean;
  onAdvance(order: Order): void;
  onRevert(order: Order): void;
}

/**
 * Andamento do pedido na lista (2026-10-10): um clique avança (Em preparo → Saiu → Entregue)
 * e a seta pequena volta um passo, para o clique errado.
 */
export function OrderStatusCell(props: OrderStatusCellProps) {
  const { order, locked, onAdvance, onRevert } = props;
  if (order.type === null) return <td>—</td>;
  const label = statusLabel(order.status);
  const number = `#${order.dayNumber}`;
  return (
    <td className="order-status-cell">
      {locked || !canAdvance(order) ? (
        <span className="order-status" data-status={order.status}>
          {label}
        </span>
      ) : (
        <button
          type="button"
          className="order-status"
          data-status={order.status}
          aria-label={`Status do ${number}: ${label}`}
          title="Avançar o status"
          onClick={() => onAdvance(order)}
        >
          {label}
          <ChevronRight aria-hidden />
        </button>
      )}
      {!locked && canRevert(order) && (
        <button
          type="button"
          className="button-ghost button-sm order-status-back"
          aria-label={`Voltar o status do ${number}`}
          title="Voltar um passo"
          onClick={() => onRevert(order)}
        >
          <Undo2 aria-hidden />
        </button>
      )}
    </td>
  );
}
