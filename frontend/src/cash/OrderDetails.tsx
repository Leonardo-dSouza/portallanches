import { Ban, Pencil, Printer } from 'lucide-react';
import type { CashApi } from '../api/cash-api';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { Dialog } from '../components/Dialog';
import { formatAddress } from './address';
import { ItemsTable } from './ItemsTable';
import { treeOfOrderItems } from './item-tree';
import {
  changeToCarry,
  describeOrder,
  orderTitle,
  paymentText,
} from './order-description';
import { OrderHistory } from './OrderHistory';
import { OrderStatusControl } from './OrderStatusControl';
import type { OrderActions } from './use-order-actions';
import { formatOrderTime } from './order-time';
import { Figure } from './PaymentFigures';
import type { CashDay } from './use-cash-day';

interface OrderDetailsProps {
  cash: CashApi;
  order: Order;
  day: CashDay;
  /** Dia fechado: só mostra, sem o Editar nem o status. */
  locked: boolean;
  /** Mudar o status é aqui (2026-10-16), não na lista. */
  actions: OrderActions;
  now: Date;
  onEdit(order: Order): void;
  onCancel(order: Order): void;
  onReprint(order: Order): void;
  onClose(): void;
}

/** Cliente da entrega: telefone, endereço com número, referência e bairro. */
function CustomerFigures({ order, day }: { order: Order; day: CashDay }) {
  const { neighborhood } = describeOrder(order, day);
  return (
    <dl className="report order-details-customer">
      <Figure label="Telefone" value={order.customerPhone ?? '—'} />
      <Figure
        label="Endereço"
        value={formatAddress(order.customerStreet ?? '—', order.customerNumber)}
      />
      {order.customerReference && (
        <Figure label="Referência" value={order.customerReference} />
      )}
      <Figure label="Bairro" value={neighborhood} />
    </dl>
  );
}

function OrderItems({ order }: { order: Order }) {
  if (order.items.length === 0)
    return (
      <p className="hint">Pedido importado da planilha, só com o valor.</p>
    );
  return <ItemsTable rows={treeOfOrderItems(order.items)} />;
}

function OrderTotals({ order, day }: { order: Order; day: CashDay }) {
  return (
    <dl className="report order-details-totals">
      {order.type === 'DELIVERY' && order.deliveryFee && (
        <Figure
          label="Taxa de entrega"
          value={formatMoney(order.deliveryFee)}
        />
      )}
      <Figure label="Total" value={formatMoney(order.amount)} />
      <Figure label="Pagamento" value={paymentText(order, day)} />
      {order.changeFor && (
        <Figure
          label="Troco para"
          value={`${formatMoney(order.changeFor)} (levar ${formatMoney(changeToCarry(order.changeFor, order.amount))})`}
        />
      )}
    </dl>
  );
}

/** Hora do lançamento e andamento, logo abaixo do título. */
function OrderMoment({ order }: { order: Order }) {
  return (
    <p className="order-details-moment">
      Lançado às {formatOrderTime(order.createdAt)}
      {order.canceledAt && ` · Cancelado: ${order.cancelReason}`}
    </p>
  );
}

/**
 * Pop-up do pedido (pedido do usuário, 2026-10-10): todos os itens com unitário e total, os
 * adicionais com o preço deles, o cliente da entrega, a taxa, o total e o pagamento.
 */
export function OrderDetails(props: OrderDetailsProps) {
  const { cash, order, day, locked, onEdit, onCancel, onReprint, onClose } =
    props;
  const canceled = order.canceledAt !== null;
  const status = canceled ? null : (
    <OrderStatusControl
      order={order}
      actions={props.actions}
      locked={locked}
      now={props.now}
    />
  );
  return (
    <Dialog title={orderTitle(order)} onClose={onClose}>
      <OrderMoment order={order} />
      {status}
      {order.type === 'DELIVERY' && <CustomerFigures order={order} day={day} />}
      <OrderItems order={order} />
      <OrderTotals order={order} day={day} />
      <OrderHistory cash={cash} order={order} methods={day.paymentMethods} />
      <div className="dialog-actions">
        {!canceled && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => onReprint(order)}
          >
            <Printer aria-hidden />
            Reimprimir
          </button>
        )}
        {!locked && !canceled && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => onEdit(order)}
          >
            <Pencil aria-hidden />
            Editar pedido
          </button>
        )}
        {!locked && !canceled && (
          <button
            type="button"
            className="button-ghost button-danger"
            onClick={() => onCancel(order)}
          >
            <Ban aria-hidden />
            Cancelar pedido
          </button>
        )}
      </div>
    </Dialog>
  );
}
