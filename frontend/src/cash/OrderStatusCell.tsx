import { Check, ChevronRight, Undo2 } from 'lucide-react';
import type { Order, OrderStatus, OrderType } from '../api/types';
import {
  canRevert,
  elapsedLabel,
  nextStatus,
  statusLabel,
  statusSteps,
  stepLabel,
} from './order-status-view';

interface OrderStatusCellProps {
  order: Order;
  /** Dia fechado: só mostra. */
  locked: boolean;
  /** Ação em andamento neste pedido: as teclas ficam travadas. */
  busy: boolean;
  /** Hora atual (renovada pela lista): o "há 12 min". */
  now: Date;
  onAdvance(order: Order): void;
  onRevert(order: Order): void;
}

type StepState = 'done' | 'current' | 'todo';

function stateOf(
  steps: readonly OrderStatus[],
  step: OrderStatus,
  current: OrderStatus,
): StepState {
  const diff = steps.indexOf(step) - steps.indexOf(current);
  if (diff === 0) return 'current';
  return diff < 0 ? 'done' : 'todo';
}

/** Preparo › Saiu › Entregue: a etapa atual na cor dela, as passadas com ✓. */
function StatusTrack({ order, type }: { order: Order; type: OrderType }) {
  const steps = statusSteps(type);
  return (
    <ol
      className="status-track"
      aria-label={`Andamento do #${order.dayNumber}: ${statusLabel(order.status)}`}
    >
      {steps.map((step) => {
        const state = stateOf(steps, step, order.status);
        return (
          <li
            key={step}
            data-state={state}
            data-status={step}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            {state === 'done' && <Check aria-hidden />}
            {stepLabel(step)}
          </li>
        );
      })}
    </ol>
  );
}

/** A tecla da próxima etapa, na cor dela ("Saiu ›", "Entregue ›"). */
function NextStepKey(props: OrderStatusCellProps) {
  const { order, busy, onAdvance } = props;
  const next = nextStatus(order);
  if (!next) return null;
  return (
    <button
      type="button"
      className="status-next"
      data-status={next}
      disabled={busy}
      aria-busy={busy}
      aria-label={`Marcar o #${order.dayNumber} como ${statusLabel(next)}`}
      onClick={() => onAdvance(order)}
    >
      {stepLabel(next)}
      <ChevronRight aria-hidden />
    </button>
  );
}

/**
 * Andamento do pedido na lista (redesenho de 2026-10-15): a trilha das etapas, a tecla com a
 * próxima ação, há quanto tempo está na etapa e a seta de voltar um passo (clique errado).
 */
export function OrderStatusCell(props: OrderStatusCellProps) {
  const { order, locked, busy, now, onRevert } = props;
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
      <div className="status-actions">
        {!locked && <NextStepKey {...props} />}
        <span className="status-since">
          {elapsedLabel(order.statusChangedAt, now)}
        </span>
        {!locked && canRevert(order) && (
          <button
            type="button"
            className="button-ghost button-sm status-back"
            disabled={busy}
            aria-label={`Voltar o status do #${order.dayNumber}`}
            title="Voltar um passo"
            onClick={() => onRevert(order)}
          >
            <Undo2 aria-hidden />
          </button>
        )}
      </div>
    </td>
  );
}
