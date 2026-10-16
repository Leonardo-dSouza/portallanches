import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import type { CashApi } from '../api/cash-api';
import type { Order } from '../api/types';
import { usePrinter } from '../print/printer-context';
import { fullReceipt } from '../print/receipt-model';
import { useTicketSettings } from '../print/ticket-settings';
import { CancelOrderDialog } from './CancelOrderDialog';
import { matchesFilter, type OrderFilter } from './order-filters';
import { OrderDetails } from './OrderDetails';
import { OrderFilters } from './OrderFilters';
import { OrderRow } from './OrderRow';
import { useNow } from './use-now';
import type { CashDay } from './use-cash-day';
import { useOrderActions, type OrderActions } from './use-order-actions';

interface OrderListProps {
  cash: CashApi;
  day: CashDay;
  locked: boolean;
  /** O pedido aberto na comanda: a linha fica destacada (2026-10-15). */
  editingId: number | null;
  onEdit(order: Order): void;
  onChanged(): void;
}

interface OrderTableProps {
  orders: Order[];
  day: CashDay;
  locked: boolean;
  editingId: number | null;
  now: Date;
  actions: OrderActions;
  onOpen(order: Order): void;
  onEdit(order: Order): void;
  onCancel(order: Order): void;
  onReprint(order: Order): void;
}

function OrderTable({
  orders,
  day,
  locked,
  editingId,
  now,
  actions,
  ...rest
}: OrderTableProps) {
  if (orders.length === 0)
    return <p className="page-message">Nenhum pedido neste filtro.</p>;
  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Cliente e pagamento</th>
            <th>Itens</th>
            <th>Status</th>
            <th className="num">Valor</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              day={day}
              locked={locked}
              editing={order.id === editingId}
              now={now}
              onOpen={rest.onOpen}
              onEdit={rest.onEdit}
              onCancel={rest.onCancel}
              onRestore={actions.restore}
              onReprint={rest.onReprint}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Pedidos do dia com filtros (Todos, A pagar, Em preparo, Entregas, Balcão), o status na
 * linha e o pop-up com os preços. Sem paginação: tudo cabe numa tela.
 */
export function OrderList({
  cash,
  day,
  locked,
  editingId,
  onEdit,
  onChanged,
}: OrderListProps) {
  const actions = useOrderActions(cash, onChanged);
  const printer = usePrinter();
  const ticket = useTicketSettings();
  // Reimprimir sempre sai (papel acabou, pedido editado), mesmo com o "ao salvar" desligado.
  const reprint = (order: Order) =>
    printer.print(fullReceipt(order, { ...day, ticket }));
  const [filter, setFilter] = useState<OrderFilter>('all');
  // O id, não o pedido: depois de mudar o status a lista recarrega e o pop-up mostra o novo.
  const [viewingId, setViewingId] = useState<number | null>(null);
  const viewing = day.orders.find((order) => order.id === viewingId) ?? null;
  const setViewing = (order: Order | null) => setViewingId(order?.id ?? null);
  // Um relógio só para a lista e o pop-up: o "há 12 min" anda junto.
  const now = useNow();
  const [canceling, setCanceling] = useState<Order | null>(null);
  const canceled = () => {
    setCanceling(null);
    onChanged();
  };
  const editFromDetails = (order: Order) => {
    setViewing(null);
    onEdit(order);
  };
  const cancelFromDetails = (order: Order) => {
    setViewing(null);
    setCanceling(order);
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
      <OrderFilters orders={day.orders} active={filter} onChange={setFilter} />
      {/* Com o pop-up aberto, a recusa aparece nele (ao lado da tecla do status). */}
      {actions.error && !viewing && (
        <p className="form-error" role="alert">
          {actions.error}
        </p>
      )}
      <OrderTable
        orders={day.orders.filter((order) => matchesFilter(order, filter))}
        day={day}
        locked={locked}
        editingId={editingId}
        now={now}
        actions={actions}
        onOpen={setViewing}
        onEdit={onEdit}
        onCancel={setCanceling}
        onReprint={reprint}
      />
      {canceling && (
        <CancelOrderDialog
          cash={cash}
          order={canceling}
          onCanceled={canceled}
          onClose={() => setCanceling(null)}
        />
      )}
      {viewing && (
        <OrderDetails
          cash={cash}
          order={viewing}
          day={day}
          locked={locked}
          actions={actions}
          now={now}
          onEdit={editFromDetails}
          onCancel={cancelFromDetails}
          onReprint={reprint}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
