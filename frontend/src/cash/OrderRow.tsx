import { Ban, Pencil, Printer, RotateCcw } from 'lucide-react';
import type { MouseEvent } from 'react';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { ItemTree } from './ItemTree';
import { useTicketSettings } from '../print/ticket-settings';
import { describeItems, treeOfOrderItems } from './item-tree';
import { describeOrder } from './order-description';
import { useAuth } from '../auth/auth-context';
import { isCanceled, isOpenAccount } from './order-filters';
import { formatOrderTime } from './order-time';
import { OrderStatusCell } from './OrderStatusCell';
import type { CashDay } from './use-cash-day';

const TYPE_LABEL = { COUNTER: 'Balcão', DELIVERY: 'Entrega' } as const;

interface OrderRowProps {
  order: Order;
  day: CashDay;
  locked: boolean;
  /** Aberto na comanda agora (2026-10-15). */
  editing: boolean;
  onOpen(order: Order): void;
  onEdit(order: Order): void;
  onCancel(order: Order): void;
  onRestore(order: Order): void;
  onAdvance(order: Order): void;
  onRevert(order: Order): void;
  onReprint(order: Order): void;
}

/** Clique na linha abre o pop-up; nos botões dela, só o botão age. */
function openUnlessButton(event: MouseEvent, open: () => void): void {
  if (event.target instanceof Element && event.target.closest('button')) return;
  open();
}

/** Embaixo do nome: a forma (ou "A pagar"); no cancelado, o motivo. */
function PaymentLine({ order, method }: { order: Order; method: string }) {
  if (isCanceled(order)) return <>Motivo: {order.cancelReason}</>;
  if (isOpenAccount(order))
    return (
      <span className="tag" data-kind="OPEN">
        A pagar
      </span>
    );
  return <>{method}</>;
}

/** Tipo e nome na 1ª linha; embaixo, a forma (ou "A pagar") e o bairro da entrega. */
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
        <PaymentLine order={order} method={method} />
        {order.type === 'DELIVERY' && ` · ${neighborhood}`}
      </span>
    </td>
  );
}

/** O cancelado só tem o "Desfazer cancelamento", e só para o admin. */
function CanceledActions({ order, onRestore }: OrderRowProps) {
  const isAdmin = useAuth().user?.role === 'ADMIN';
  return (
    <td className="row-actions">
      {isAdmin && (
        <button
          type="button"
          className="button-ghost button-sm"
          aria-label={`Desfazer cancelamento do #${order.dayNumber}`}
          title="Desfazer o cancelamento"
          onClick={() => onRestore(order)}
        >
          <RotateCcw aria-hidden />
        </button>
      )}
    </td>
  );
}

function RowActions(props: OrderRowProps) {
  const { order, locked, onEdit, onCancel, onReprint } = props;
  if (isCanceled(order)) return <CanceledActions {...props} />;
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
            aria-label="Cancelar pedido"
            title="Cancelar pedido (fica na lista, com o motivo)"
            onClick={() => onCancel(order)}
          >
            <Ban aria-hidden />
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
  const { artisanalMark } = useTicketSettings();
  return (
    <tr
      className="order-row"
      data-canceled={isCanceled(order) || undefined}
      data-editing={props.editing || undefined}
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
      <td
        className="order-items-cell"
        title={describeItems(order.items, artisanalMark)}
      >
        <ItemTree rows={treeOfOrderItems(order.items)} />
      </td>
      <OrderStatusCell
        order={order}
        // Cancelado não muda de status (a célula só mostra "Cancelado").
        locked={locked || isCanceled(order)}
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
