import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import type { CashApi } from '../api/cash-api';
import type { Order } from '../api/types';
import type { FiadoDueOrder } from '../api/fiado-types';
import { CancelOrderDialog } from './CancelOrderDialog';
import { fiadoDetailActions } from './fiado-detail-actions';
import { FiadoDialogs } from './FiadoDialogs';
import { FiadoDueRows } from './FiadoDueRows';
import { fiadoTargetOfOrder } from './fiado-labels';
import {
  matchesFilter,
  newestFirst,
  showsFiadoDue,
  type OrderFilter,
} from './order-filters';
import { useFiadoDialogs, type FiadoDialogsState } from './use-fiado-dialogs';
import { OrderDetails } from './OrderDetails';
import { OrderFilters } from './OrderFilters';
import { OrderRow } from './OrderRow';
import { useNow } from './use-now';
import { useReprint } from './use-reprint';
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
  /** Fiados de outras noites a cobrar nesta (só em Todos e A pagar). */
  due: FiadoDueOrder[];
  day: CashDay;
  locked: boolean;
  editingId: number | null;
  now: Date;
  actions: OrderActions;
  fiado: FiadoDialogsState;
  onOpen(order: Order): void;
  onEdit(order: Order): void;
  onCancel(order: Order): void;
  onReprint(order: Order): void;
}

function OrderTable({
  orders,
  due,
  day,
  locked,
  editingId,
  now,
  actions,
  fiado,
  ...rest
}: OrderTableProps) {
  if (orders.length === 0 && due.length === 0)
    return <p className="page-message">Nenhum pedido neste filtro.</p>;
  const receive = (order: Order) => {
    const target = fiadoTargetOfOrder(order, day.closing.businessDate);
    if (target) fiado.receive(target);
  };
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
        <FiadoDueRows
          due={due}
          today={day.closing.businessDate}
          locked={locked}
          onReceive={fiado.receive}
          onReschedule={fiado.reschedule}
        />
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
              onReceive={receive}
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
  const reprint = useReprint(day);
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
  const fiado = useFiadoDialogs();
  // Começo da noite: o fiado previsto para hoje já aparece, mesmo sem pedido lançado.
  if (day.orders.length === 0 && day.fiadoDue.length === 0)
    return (
      <EmptyState
        title="Nenhum pedido neste dia"
        hint="Use o formulário ao lado para lançar o primeiro."
      />
    );
  return (
    <div className="card card-flush">
      <OrderFilters
        orders={day.orders}
        dueCount={day.fiadoDue.length}
        active={filter}
        onChange={setFilter}
      />
      {/* Com o pop-up aberto, a recusa aparece nele (ao lado da tecla do status). */}
      {actions.error && !viewing && (
        <p className="form-error" role="alert">
          {actions.error}
        </p>
      )}
      <OrderTable
        orders={newestFirst(day.orders).filter((order) =>
          matchesFilter(order, filter),
        )}
        due={showsFiadoDue({ id: filter }) ? day.fiadoDue : []}
        day={day}
        locked={locked}
        editingId={editingId}
        now={now}
        actions={actions}
        fiado={fiado}
        onOpen={setViewing}
        onEdit={onEdit}
        onCancel={setCanceling}
        onReprint={reprint}
      />
      <FiadoDialogs cash={cash} day={day} state={fiado} onChanged={onChanged} />
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
          fiado={fiadoDetailActions(
            locked
              ? null
              : fiadoTargetOfOrder(viewing, day.closing.businessDate),
            fiado,
            () => setViewing(null),
          )}
        />
      )}
    </div>
  );
}
