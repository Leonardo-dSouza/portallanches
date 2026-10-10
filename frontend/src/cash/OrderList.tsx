import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import type { CashApi } from '../api/cash-api';
import type { Order } from '../api/types';
import { usePrinter } from '../print/printer-context';
import { fullReceipt } from '../print/receipt-model';
import { matchesFilter, type OrderFilter } from './order-filters';
import { OrderDetails } from './OrderDetails';
import { OrderFilters } from './OrderFilters';
import { OrderRow } from './OrderRow';
import type { CashDay } from './use-cash-day';
import { useOrderActions, type OrderActions } from './use-order-actions';

interface OrderListProps {
  cash: CashApi;
  day: CashDay;
  locked: boolean;
  onEdit(order: Order): void;
  onChanged(): void;
}

interface OrderTableProps {
  orders: Order[];
  day: CashDay;
  locked: boolean;
  actions: OrderActions;
  onOpen(order: Order): void;
  onEdit(order: Order): void;
  onReprint(order: Order): void;
}

function OrderTable({
  orders,
  day,
  locked,
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
              onOpen={rest.onOpen}
              onEdit={rest.onEdit}
              onRemove={actions.remove}
              onAdvance={actions.advance}
              onRevert={actions.revert}
              onReprint={rest.onReprint}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Pedidos do dia com filtros (Todos, Abertos, Em andamento, Entregas, Balcão), o status na
 * linha e o pop-up com os preços. Sem paginação: tudo cabe numa tela.
 */
export function OrderList({
  cash,
  day,
  locked,
  onEdit,
  onChanged,
}: OrderListProps) {
  const actions = useOrderActions(cash, onChanged);
  const printer = usePrinter();
  // Reimprimir sempre sai (papel acabou, pedido editado), mesmo com o "ao salvar" desligado.
  const reprint = (order: Order) => printer.print(fullReceipt(order, day));
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [viewing, setViewing] = useState<Order | null>(null);
  const editFromDetails = (order: Order) => {
    setViewing(null);
    onEdit(order);
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
      {actions.error && (
        <p className="form-error" role="alert">
          {actions.error}
        </p>
      )}
      <OrderTable
        orders={day.orders.filter((order) => matchesFilter(order, filter))}
        day={day}
        locked={locked}
        actions={actions}
        onOpen={setViewing}
        onEdit={onEdit}
        onReprint={reprint}
      />
      {viewing && (
        <OrderDetails
          order={viewing}
          day={day}
          locked={locked}
          onEdit={editFromDetails}
          onReprint={reprint}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
