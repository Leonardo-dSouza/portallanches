import type { DayClosing } from '../api/day-closing-api';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { describeItems } from '../cash/order-lines';
import { describePayment } from '../cash/payment-choice';

// Entregas primeiro (têm cliente e taxa), depois o balcão; importados da planilha no fim.
const GROUPS: readonly { title: string; matches(order: Order): boolean }[] = [
  { title: 'Entregas', matches: (o) => o.type === 'DELIVERY' },
  { title: 'Balcão', matches: (o) => o.type === 'COUNTER' },
  { title: 'Pedidos antigos (só o valor)', matches: (o) => o.type === null },
];

function CustomerCell({ order, day }: { order: Order; day: DayClosing }) {
  if (!order.customerName) return <td className="day-order-customer">—</td>;
  const zone = day.zones.find((z) => z.id === order.deliveryZoneId);
  const where = [order.customerStreet, zone?.neighborhood]
    .filter(Boolean)
    .join(' · ');
  return (
    <td className="day-order-customer">
      <span>{order.customerName}</span>
      {where && <small>{where}</small>}
    </td>
  );
}

function OrderRow({ order, day }: { order: Order; day: DayClosing }) {
  const method = day.paymentMethods.find((m) => m.id === order.paymentMethodId);
  return (
    <tr className="menu-row day-order">
      <td className="day-order-amount">
        <strong>{formatMoney(order.amount)}</strong>
        {order.type === 'DELIVERY' && order.deliveryFee && (
          <small>taxa {formatMoney(order.deliveryFee)}</small>
        )}
      </td>
      <td className="day-order-items">{describeItems(order.items) || '—'}</td>
      <CustomerCell order={order} day={day} />
      <td className="day-order-payment">
        {describePayment(method, order.paymentMode)}
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
          <th>Valor</th>
          <th>Itens</th>
          <th>Cliente</th>
          <th>Pagamento</th>
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.title}>
          <tr className="menu-section">
            <th colSpan={4} scope="rowgroup">
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
