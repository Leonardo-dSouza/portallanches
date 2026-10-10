import { Pencil, Printer, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { ItemTree } from './ItemTree';
import { describeItems, treeOfOrderItems } from './item-tree';
import { describeOrder } from './order-description';
import { isOpenAccount } from './order-filters';
import { formatOrderTime } from './order-time';
import { OrderStatusCell } from './OrderStatusCell';
import type { CashDay } from './use-cash-day';

const TYPE_LABEL = { COUNTER: 'Balcão', DELIVERY: 'Entrega' } as const;

interface OrderRowProps {
  order: Order;
  day: CashDay;
  locked: boolean;
  onOpen(order: Order): void;
  onEdit(order: Order): void;
  onRemove(order: Order): void;
  onAdvance(order: Order): void;
  onRevert(order: Order): void;
  onReprint(order: Order): void;
}

/** Clique na linha abre o pop-up; nos botões dela, só o botão age. */
function openUnlessButton(event: MouseEvent, open: () => void): void {
  if (event.target instanceof Element && event.target.closest('button')) return;
  open();
}

/** Tipo e nome na 1ª linha; embaixo, a forma (ou "Aberto") e o bairro da entrega. */
function CustomerCell({ order, day }: { order: Order; day: CashDay }) {
  const { method, neighborhood } = describeOrder(order, day);
  return (
    <td className="order-customer-cell">
      {order.type ? (
        <span className="tag" data-kind={order.type}>
          {TYPE_LABEL[order.type]}
        </span>
      ) : (
        '—'
      )}{' '}
      {order.customerName}
      <span className="cell-sub">
        {isOpenAccount(order) ? (
          <span className="tag" data-kind="OPEN">
            Aberto
          </span>
        ) : (
          method
        )}
        {order.type === 'DELIVERY' && ` · ${neighborhood}`}
      </span>
    </td>
  );
}

function RowActions(props: OrderRowProps) {
  const { order, locked, onEdit, onRemove, onReprint } = props;
  return (
    <td className="row-actions">
      {/* Só ícone (com nome e dica): a lista divide a tela com a comanda larga. */}
      <button
        type="button"
        className="button-ghost button-sm"
        aria-label="Reimprimir"
        title="Imprimir a comanda de novo"
        onClick={() => onReprint(order)}
      >
        <Printer aria-hidden />
      </button>
      {!locked && (
        <>
          <button
            type="button"
            className="button button-secondary button-sm"
            aria-label="Editar"
            title="Editar pedido"
            onClick={() => onEdit(order)}
          >
            <Pencil aria-hidden />
          </button>
          <button
            type="button"
            className="button-ghost button-sm button-danger"
            aria-label="Apagar"
            title="Apagar pedido"
            onClick={() => onRemove(order)}
          >
            <Trash2 aria-hidden />
          </button>
        </>
      )}
    </td>
  );
}

/**
 * Na ordem pedida pelo usuário (2026-10-10): número e hora, tipo e nome com a forma e o bairro
 * embaixo, itens, status e o valor com a taxa embaixo. Clicar na linha
 * abre o pop-up com os preços; pelo teclado, o número do pedido é o botão.
 */
export function OrderRow(props: OrderRowProps) {
  const { order, day, locked, onOpen } = props;
  return (
    <tr
      className="order-row"
      onClick={(event) => openUnlessButton(event, () => onOpen(order))}
    >
      <td className="order-number-cell">
        <button
          type="button"
          className="order-number"
          aria-label={`Ver pedido #${order.dayNumber}`}
          title="Ver os itens com os preços"
          onClick={() => onOpen(order)}
        >
          #{order.dayNumber}
        </button>
        <span className="cell-sub">{formatOrderTime(order.createdAt)}</span>
      </td>
      <CustomerCell order={order} day={day} />
      <td className="order-items-cell" title={describeItems(order.items)}>
        <ItemTree rows={treeOfOrderItems(order.items)} />
      </td>
      <OrderStatusCell
        order={order}
        locked={locked}
        onAdvance={props.onAdvance}
        onRevert={props.onRevert}
      />
      <td className="num strong">
        {formatMoney(order.amount)}
        {order.type === 'DELIVERY' && order.deliveryFee && (
          <span className="cell-sub">
            taxa {formatMoney(order.deliveryFee)}
          </span>
        )}
      </td>
      <RowActions {...props} />
    </tr>
  );
}
