import { Pencil, ReceiptText, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { ItemTree } from './ItemTree';
import { describeItems, treeOfOrderItems } from './item-tree';
import { describeOrder } from './order-description';
import type { CashDay } from './use-cash-day';

const TYPE_LABEL = { COUNTER: 'Balcão', DELIVERY: 'Entrega' } as const;

interface OrderRowProps {
  order: Order;
  day: CashDay;
  locked: boolean;
  onOpen(order: Order): void;
  onEdit(order: Order): void;
  onRemove(order: Order): void;
}

/** Clique na linha abre o pop-up; nos botões dela, só o botão age. */
function openUnlessButton(event: MouseEvent, open: () => void): void {
  if (event.target instanceof Element && event.target.closest('button')) return;
  open();
}

function RowActions({
  order,
  locked,
  onOpen,
  onEdit,
  onRemove,
}: OrderRowProps) {
  return (
    <td className="row-actions">
      {/* Só ícone (com nome e dica): a lista divide a tela com a comanda larga. */}
      <button
        type="button"
        className="button-ghost button-sm"
        aria-label="Ver pedido"
        title="Ver os itens com os preços"
        onClick={() => onOpen(order)}
      >
        <ReceiptText aria-hidden />
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
 * Valor com a taxa embaixo, tipo com o pagamento embaixo e cliente com o bairro embaixo:
 * a lista cabe ao lado da comanda larga, e os itens ocupam o que sobra. Clicar na linha abre
 * o pop-up com os preços (2026-10-10); pelo teclado, o botão "Ver pedido".
 */
export function OrderRow(props: OrderRowProps) {
  const { order, day, onOpen } = props;
  const { method, neighborhood } = describeOrder(order, day);
  const isDelivery = order.type === 'DELIVERY';
  return (
    <tr
      className="order-row"
      onClick={(event) => openUnlessButton(event, () => onOpen(order))}
    >
      <td className="num strong">
        {formatMoney(order.amount)}
        {isDelivery && order.deliveryFee && (
          <span className="cell-sub">
            taxa {formatMoney(order.deliveryFee)}
          </span>
        )}
      </td>
      <td className="order-items-cell" title={describeItems(order.items)}>
        <ItemTree rows={treeOfOrderItems(order.items)} />
      </td>
      <td>
        {order.type ? (
          <span className="tag" data-kind={order.type}>
            {TYPE_LABEL[order.type]}
          </span>
        ) : (
          '—'
        )}
        <span className="cell-sub">{method}</span>
      </td>
      <td>
        {order.customerName ?? '—'}
        {isDelivery && <span className="cell-sub">{neighborhood}</span>}
      </td>
      <RowActions {...props} />
    </tr>
  );
}
