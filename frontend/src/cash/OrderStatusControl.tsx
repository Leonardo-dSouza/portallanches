import { ChevronRight, Undo2 } from 'lucide-react';
import type { Order } from '../api/types';
import {
  canRevert,
  elapsedLabel,
  nextStatus,
  statusLabel,
} from './order-status-view';
import { StatusTrack } from './StatusTrack';
import type { OrderActions } from './use-order-actions';

interface OrderStatusControlProps {
  order: Order;
  actions: OrderActions;
  /** Dia fechado ou pedido cancelado: só mostra. */
  locked: boolean;
  now: Date;
}

/**
 * O andamento no pop-up do pedido (2026-10-16): a trilha, a tecla da próxima etapa (com o foco,
 * para clicar no pedido e dar Enter) e "Voltar um passo" para o clique errado.
 */
export function OrderStatusControl(props: OrderStatusControlProps) {
  const { order, actions, locked, now } = props;
  if (order.type === null) return null;
  const next = nextStatus(order);
  const busy = actions.isBusy(order);
  return (
    <section className="status-control" aria-label="Andamento do pedido">
      <div className="status-control-head">
        <StatusTrack order={order} type={order.type} />
        <span className="status-since">
          {elapsedLabel(order.statusChangedAt, now)}
        </span>
      </div>
      {!locked && (
        <div className="status-control-actions">
          {next && (
            <button
              type="button"
              className="status-next"
              data-status={next}
              // Abriu o pedido para andar com ele: o Enter já marca a próxima etapa.
              data-autofocus
              disabled={busy}
              aria-busy={busy}
              onClick={() => actions.advance(order)}
            >
              Marcar como {statusLabel(next)}
              <ChevronRight aria-hidden />
            </button>
          )}
          {canRevert(order) && (
            <button
              type="button"
              className="button-ghost button-sm"
              disabled={busy}
              onClick={() => actions.revert(order)}
            >
              <Undo2 aria-hidden />
              Voltar um passo
            </button>
          )}
        </div>
      )}
      {actions.error && (
        <p className="form-error" role="alert">
          {actions.error}
        </p>
      )}
    </section>
  );
}
