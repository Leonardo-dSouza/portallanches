import { Pencil } from 'lucide-react';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { Dialog } from '../components/Dialog';
import { formatAddress } from './address';
import { ItemsTable } from './ItemsTable';
import { treeOfOrderItems } from './item-tree';
import { describeOrder, orderTitle } from './order-description';
import { Figure } from './PaymentFigures';
import type { CashDay } from './use-cash-day';

interface OrderDetailsProps {
  order: Order;
  day: CashDay;
  /** Dia fechado: só mostra, sem o Editar. */
  locked: boolean;
  onEdit(order: Order): void;
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
      <Figure label="Pagamento" value={describeOrder(order, day).method} />
    </dl>
  );
}

/**
 * Pop-up do pedido (pedido do usuário, 2026-10-10): todos os itens com unitário e total, os
 * adicionais com o preço deles, o cliente da entrega, a taxa, o total e o pagamento.
 */
export function OrderDetails(props: OrderDetailsProps) {
  const { order, day, locked, onEdit, onClose } = props;
  return (
    <Dialog title={orderTitle(order)} onClose={onClose}>
      {order.type === 'DELIVERY' && <CustomerFigures order={order} day={day} />}
      <OrderItems order={order} />
      <OrderTotals order={order} day={day} />
      {!locked && (
        <div className="dialog-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => onEdit(order)}
          >
            <Pencil aria-hidden />
            Editar pedido
          </button>
        </div>
      )}
    </Dialog>
  );
}
