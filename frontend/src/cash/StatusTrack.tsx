import { Check } from 'lucide-react';
import type { Order, OrderStatus, OrderType } from '../api/types';
import { statusLabel, statusSteps, stepLabel } from './order-status-view';

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

/**
 * Preparo › Saiu › Entregue (balcão sem o Saiu): a etapa atual na cor dela, as passadas com ✓.
 * Na lista e no pop-up do pedido (2026-10-15).
 *
 * @example <StatusTrack order={order} type="DELIVERY" />
 */
export function StatusTrack({
  order,
  type,
}: {
  order: Order;
  type: OrderType;
}) {
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
