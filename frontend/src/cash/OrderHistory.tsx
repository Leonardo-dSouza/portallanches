import { useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { OrderEvent } from '../api/order-event-types';
import type { Order, PaymentMethod } from '../api/types';
import { eventText } from './order-event-text';
import { formatOrderTime } from './order-time';

interface OrderHistoryProps {
  cash: CashApi;
  order: Order;
  methods: PaymentMethod[];
}

function useOrderEvents(cash: CashApi, orderId: number) {
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    cash.listOrderEvents(orderId).then(
      (read) => current && setEvents(read),
      (failure) => current && setError(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [cash, orderId]);
  return { events, error };
}

/**
 * Histórico do pedido no pop-up (2026-10-15): lançado, alterado (antes → depois), status,
 * cancelado com o motivo, e quando a senha do admin liberou. Pedido de antes não tem passos.
 */
export function OrderHistory({ cash, order, methods }: OrderHistoryProps) {
  const { events, error } = useOrderEvents(cash, order.id);
  if (error) return <p className="form-error">{error}</p>;
  if (!events) return null;
  return (
    <section className="order-history" aria-label="Histórico do pedido">
      <h3>Histórico</h3>
      {events.length === 0 ? (
        <p className="hint">Lançado antes do histórico existir.</p>
      ) : (
        <ol>
          {events.map((event) => (
            <li key={event.id}>
              <time dateTime={event.at}>{formatOrderTime(event.at)}</time>
              {eventText(event, methods)}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
