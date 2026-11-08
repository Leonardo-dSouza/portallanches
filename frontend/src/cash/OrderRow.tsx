import {
  Ban,
  HandCoins,
  ListPlus,
  Pencil,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';
import { ItemTree } from './ItemTree';
import { useTicketSettings } from '../print/ticket-settings';
import { describeItems, treeOfOrderItems } from './item-tree';
import { describeOrder } from './order-description';
import { useAuth } from '../auth/auth-context';
import { isCanceled } from './order-filters';
import { canReceive, paymentTagOf } from './payment-tag';
import { DiningTag } from './DiningTag';
import { formatOrderTime } from './order-time';
import { OrderStatusCell } from './OrderStatusCell';
import { openUnlessButton } from './row-click';
import type { CashDay } from './use-cash-day';

const TYPE_LABEL = { COUNTER: 'Balcão', DELIVERY: 'Entrega' } as const;

interface OrderRowProps {
  order: Order;
  day: CashDay;
  locked: boolean;
  /** Aberto na comanda agora (2026-10-15). */
  editing: boolean;
  /** Hora atual, renovada pela lista ("há 12 min"). */
  now: Date;
  onOpen(order: Order): void;
  onAdd(order: Order): void;
  onEdit(order: Order): void;
  onCancel(order: Order): void;
  onRestore(order: Order): void;
  onReprint(order: Order): void;
  /** Receber o A pagar ou o fiado da própria noite (card 8: a mesma tecla). */
  onReceive(order: Order): void;
}

/**
 * Tipo e nome na 1ª linha; embaixo, o bairro da entrega ou, no cancelado, o motivo. A forma de
 * pagamento foi para baixo do valor (card 8, 2026-11-08).
 */
function CustomerSub({ order, day }: { order: Order; day: CashDay }) {
  if (isCanceled(order)) return <>Motivo: {order.cancelReason}</>;
  if (order.type !== 'DELIVERY') return null;
  return <>{describeOrder(order, day).neighborhood}</>;
}

function CustomerCell({ order, day }: { order: Order; day: CashDay }) {
  return (
    <td className="order-customer-cell" data-label="Cliente">
      {order.type ? (
        <>
          <span className="tag" data-kind={order.type}>
            {TYPE_LABEL[order.type]}
          </span>
          {order.type === 'COUNTER' && (
            <>
              {' '}
              <DiningTag option={order.diningOption} />
            </>
          )}
        </>
      ) : (
        '—'
      )}{' '}
      {order.customerName}
      <span className="cell-sub">
        <CustomerSub order={order} day={day} />
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
  const { order, locked, onAdd, onEdit, onCancel, onReprint } = props;
  if (isCanceled(order)) return <CanceledActions {...props} />;
  return (
    <td className="row-actions">
      {/* Só ícone (com nome e dica): a lista divide a tela com a comanda larga. Numa caixa
          própria, que vira grade 2×2 na lista estreita (card 8: o + Item é a 4ª tecla). */}
      <div className="row-action-keys">
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
              aria-label="Acrescentar item"
              title="Acrescentar item ao pedido"
              onClick={() => onAdd(order)}
            >
              <ListPlus aria-hidden />
            </button>
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
      </div>
    </td>
  );
}

/** A situação do pagamento numa etiqueta só (card 8, 2026-11-08). */
function PaymentTagLine({ order, day }: { order: Order; day: CashDay }) {
  const tag = paymentTagOf(order, day);
  if (!tag) return null;
  return (
    <span className="payment-tag-line">
      <span className="tag payment-tag" data-tone={tag.tone}>
        {tag.text}
      </span>
      {tag.sub && <span className="cell-sub">{tag.sub}</span>}
    </span>
  );
}

/**
 * O valor com a taxa, a etiqueta do pagamento e, no A pagar e no fiado devendo, a tecla Receber
 * com nome, tudo embaixo do valor (card 8, 2026-11-08). Como 4ª tecla nas ações ela alargava a
 * coluna em todas as linhas (2026-10-27); só com ícone, ao lado do R$, desalinhava o valor.
 */
function AmountCell({ order, day, locked, onReceive }: OrderRowProps) {
  return (
    <td className="num strong order-amount-cell" data-label="Valor">
      {formatMoney(order.amount)}
      {order.type === 'DELIVERY' && order.deliveryFee && (
        <span className="cell-sub">taxa {formatMoney(order.deliveryFee)}</span>
      )}
      <PaymentTagLine order={order} day={day} />
      {!locked && canReceive(order) && (
        <button
          type="button"
          className="button button-secondary button-sm row-receive"
          title="Receber o pagamento (entra na gaveta desta noite)"
          onClick={() => onReceive(order)}
        >
          <HandCoins aria-hidden />
          Receber
        </button>
      )}
    </td>
  );
}

/**
 * Na ordem pedida pelo usuário (2026-10-10): número e hora, tipo e nome com a forma e o bairro
 * embaixo, itens, status e o valor com a taxa embaixo. Clicar na linha (o status também) abre
 * o pop-up com os preços e a mudança de status; pelo teclado, o número do pedido é o botão.
 */
export function OrderRow(props: OrderRowProps) {
  const { order, day, onOpen } = props;
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
        data-label="Itens"
        title={describeItems(order.items, artisanalMark)}
      >
        <ItemTree rows={treeOfOrderItems(order.items)} />
      </td>
      <OrderStatusCell order={order} now={props.now} />
      <AmountCell {...props} />
      <RowActions {...props} />
    </tr>
  );
}
