import type { DayClosing } from '../api/day-closing-api';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { formatAddress } from '../cash/address';
import { ItemTree } from '../cash/ItemTree';
import { treeOfOrderItems } from '../cash/item-tree';
import { statusLabel } from '../cash/order-status-view';
import { formatOrderTime } from '../cash/order-time';
import { paymentText } from '../cash/order-description';

// Entregas primeiro (têm cliente e taxa), depois o balcão; importados da planilha no fim.
const GROUPS: readonly { title: string; matches(order: Order): boolean }[] = [
  { title: 'Entregas', matches: (o) => o.type === 'DELIVERY' },
  { title: 'Balcão', matches: (o) => o.type === 'COUNTER' },
  { title: 'Pedidos antigos (só o valor)', matches: (o) => o.type === null },
];

/** Quem pediu (com rua, bairro e referência na entrega) e, embaixo, a forma de pagamento. */
function CustomerCell({ order, day }: { order: Order; day: DayClosing }) {
  const zone = day.zones.find((z) => z.id === order.deliveryZoneId);
  const street =
    order.customerStreet &&
    formatAddress(order.customerStreet, order.customerNumber);
  const where = [street, zone?.neighborhood].filter(Boolean).join(' · ');
  return (
    <td className="day-order-customer">
      <span>{order.customerName ?? '—'}</span>
      {where && <small>{where}</small>}
      {order.customerReference && <small>{order.customerReference}</small>}
      <small>{paymentText(order, day)}</small>
    </td>
  );
}

/** Na ordem do caixa (pedido do usuário, 2026-10-10): #, cliente e pagamento, itens, status, valor. */
function OrderRow({ order, day }: { order: Order; day: DayClosing }) {
  return (
    <tr className="menu-row day-order">
      <td className="day-order-number">
        <strong>#{order.dayNumber}</strong>
        <small>{formatOrderTime(order.createdAt)}</small>
      </td>
      <CustomerCell order={order} day={day} />
      <td className="day-order-items">
        <ItemTree rows={treeOfOrderItems(order.items)} />
      </td>
      <td className="day-order-status">
        {order.type ? statusLabel(order.status) : '—'}
      </td>
      <td className="day-order-amount">
        <strong>{formatMoney(order.amount)}</strong>
        {order.type === 'DELIVERY' && order.deliveryFee && (
          <small>taxa {formatMoney(order.deliveryFee)}</small>
        )}
      </td>
    </tr>
  );
}

/**
 * Os pedidos do dia como o quadro do Cardápio: uma seção por tipo e uma linha por pedido,
 * só para ler (sem editar nem apagar: corrigir é reabrir o dia).
 */
export function DayOrdersBoard({ day }: { day: DayClosing }) {
  const groups = GROUPS.map((group) => ({
    title: group.title,
    orders: day.orders.filter(group.matches),
  })).filter((group) => group.orders.length > 0);
  if (groups.length === 0)
    return <p className="analytics-empty">Nenhum pedido nesse dia.</p>;
  return (
    <table className="menu-board-table day-orders">
      <thead className="sr-only">
        <tr>
          <th>#</th>
          <th>Cliente e pagamento</th>
          <th>Itens</th>
          <th>Status</th>
          <th>Valor</th>
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.title}>
          <tr className="menu-section">
            <th colSpan={5} scope="rowgroup">
              {group.title}
              <span className="menu-section-count">{group.orders.length}</span>
            </th>
          </tr>
          {group.orders.map((order) => (
            <OrderRow key={order.id} order={order} day={day} />
          ))}
        </tbody>
      ))}
    </table>
  );
}
