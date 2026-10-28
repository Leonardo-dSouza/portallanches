import { CalendarClock, HandCoins, Undo2 } from 'lucide-react';
import type {
  FiadoOrderView,
  FiadoPayment,
  FiadoStatement,
} from '../api/fiado-types';
import { formatMoney } from '../api/money';
import type { PaymentMethod } from '../api/types';
import {
  fiadoOrderLabel,
  fiadoPaidText,
  type FiadoTarget,
} from '../cash/fiado-labels';
import { openUnlessButton } from '../cash/row-click';
import { formatDayMonth } from '../history/date-keys';

/** O que o extrato faz com cada pedido e recebimento (as janelas ficam na aba). */
export interface StatementActions {
  /** Noite fechada: só ler (Ver continua). */
  locked: boolean;
  onReceive(target: FiadoTarget): void;
  onReschedule(target: FiadoTarget): void;
  onView(order: FiadoOrderView): void;
  onCancelPayment(payment: FiadoPayment): void;
}

interface FiadoStatementPanelProps extends StatementActions {
  statement: FiadoStatement;
  methods: PaymentMethod[];
}

/**
 * O número e a noite do pedido como link (2026-10-27): abre a janela do pedido inteiro. A linha
 * toda também abre; o link é o caminho pelo teclado (o olho pequeno saiu).
 */
function OrderLink({
  order,
  onView,
}: {
  order: FiadoOrderView;
  onView(order: FiadoOrderView): void;
}) {
  const label = fiadoOrderLabel(order);
  return (
    <button
      type="button"
      className="order-number fiado-order-link"
      aria-label={`Ver o pedido ${label}`}
      title="Ver os itens, o endereço e o histórico do pedido"
      onClick={() => onView(order)}
    >
      {label}
    </button>
  );
}

/** Receber pagamento e Reagendar pagamento com nome (2026-10-27), para quem não conhece o sistema. */
function OpenOrderKeys({
  target,
  actions,
}: {
  target: FiadoTarget;
  actions: StatementActions;
}) {
  return (
    <div className="fiado-keys">
      <button
        type="button"
        className="button"
        title="Receber pagamento do fiado (entra na gaveta desta noite)"
        onClick={() => actions.onReceive(target)}
      >
        <HandCoins aria-hidden />
        Receber pagamento
      </button>
      <button
        type="button"
        className="button button-secondary"
        title="Mudar o dia combinado para o pagamento"
        onClick={() => actions.onReschedule(target)}
      >
        <CalendarClock aria-hidden />
        Reagendar pagamento
      </button>
    </div>
  );
}

function OpenOrderRow({
  order,
  customerName,
  actions,
}: {
  order: FiadoOrderView;
  customerName: string;
  actions: StatementActions;
}) {
  const target: FiadoTarget = { ...order, customerName };
  return (
    <tr
      className="fiado-open-row"
      onClick={(event) => openUnlessButton(event, () => actions.onView(order))}
    >
      <td>
        <OrderLink order={order} onView={actions.onView} />
      </td>
      <td className="num">{formatMoney(order.amount)}</td>
      <td className="num">{formatMoney(order.paidTotal)}</td>
      <td className="num strong">{formatMoney(order.remaining)}</td>
      <td>{order.dueDate ? formatDayMonth(order.dueDate) : 'sem data'}</td>
      <td className="row-actions">
        {!actions.locked && <OpenOrderKeys target={target} actions={actions} />}
      </td>
    </tr>
  );
}

function OpenOrders({
  statement,
  actions,
}: {
  statement: FiadoStatement;
  actions: StatementActions;
}) {
  if (statement.openOrders.length === 0)
    return <p className="page-message">Nada em aberto.</p>;
  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th className="num">Valor</th>
            <th className="num">Pago</th>
            <th className="num">Falta</th>
            <th>Pagar em</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {statement.openOrders.map((order) => (
            <OpenOrderRow
              key={order.orderId}
              order={order}
              customerName={statement.customer.name}
              actions={actions}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentItem({
  payment,
  methods,
  actions,
}: {
  payment: FiadoPayment;
  methods: PaymentMethod[];
  actions: StatementActions;
}) {
  const canceled = payment.canceledAt !== null;
  const order = {
    dayNumber: payment.orderDayNumber,
    businessDate: payment.orderBusinessDate,
  };
  return (
    <li className="fiado-payment" data-canceled={canceled || undefined}>
      <span>
        Noite de {formatDayMonth(payment.businessDate)}
        <small>{fiadoOrderLabel(order)}</small>
      </span>
      <span>
        <span className="fiado-paid-amount">
          {fiadoPaidText(payment, methods)}
        </span>
        {canceled && (
          <small className="fiado-reversal">
            Estornado: {payment.cancelReason}
          </small>
        )}
      </span>
      {!canceled && !actions.locked && (
        <button
          type="button"
          className="button-ghost button-sm button-danger"
          aria-label="Estornar"
          title="Estornar o recebimento (volta a faltar no pedido)"
          onClick={() => actions.onCancelPayment(payment)}
        >
          <Undo2 aria-hidden />
        </button>
      )}
    </li>
  );
}

/**
 * O extrato do cliente (2026-10-25): o que deve, os pedidos em aberto (clicar abre o pedido;
 * Receber pagamento e Reagendar pagamento),
 * os recebimentos (Estornar; o estornado fica com o motivo) e os pedidos já pagos.
 */
export function FiadoStatementPanel({
  statement,
  methods,
  ...actions
}: FiadoStatementPanelProps) {
  const { customer } = statement;
  return (
    <section
      className="card fiado-statement"
      aria-label={`Extrato de ${customer.name}`}
    >
      <header className="fiado-statement-head">
        <h2>
          {customer.name}
          {customer.phone && <small>{customer.phone}</small>}
        </h2>
        <p className="fiado-owes">Deve {formatMoney(statement.openTotal)}</p>
      </header>
      <h3>Em aberto</h3>
      <OpenOrders statement={statement} actions={actions} />
      {statement.payments.length > 0 && (
        <>
          <h3>Recebimentos</h3>
          <ol className="fiado-payments">
            {statement.payments.map((payment) => (
              <PaymentItem
                key={payment.id}
                payment={payment}
                methods={methods}
                actions={actions}
              />
            ))}
          </ol>
        </>
      )}
      {statement.paidOrders.length > 0 && (
        <>
          <h3>Pagos</h3>
          <ul className="fiado-paid">
            {statement.paidOrders.map((order) => (
              <li key={order.orderId}>
                <OrderLink order={order} onView={actions.onView} /> ·{' '}
                {formatMoney(order.amount)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
