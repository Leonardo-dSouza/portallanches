import { CalendarClock, Eye, HandCoins, Undo2 } from 'lucide-react';
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

function ViewButton({
  order,
  onView,
}: {
  order: FiadoOrderView;
  onView(order: FiadoOrderView): void;
}) {
  return (
    <button
      type="button"
      className="button-ghost button-sm"
      aria-label={`Ver o pedido ${fiadoOrderLabel(order)}`}
      title="Ver os itens e o histórico do pedido"
      onClick={() => onView(order)}
    >
      <Eye aria-hidden />
    </button>
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
    <tr>
      <td>{fiadoOrderLabel(order)}</td>
      <td className="num">{formatMoney(order.amount)}</td>
      <td className="num">{formatMoney(order.paidTotal)}</td>
      <td className="num strong">{formatMoney(order.remaining)}</td>
      <td>{order.dueDate ? formatDayMonth(order.dueDate) : 'sem data'}</td>
      <td className="row-actions">
        <ViewButton order={order} onView={actions.onView} />
        {!actions.locked && (
          <>
            <button
              type="button"
              className="button button-secondary button-sm"
              aria-label="Receber"
              title="Receber (entra na gaveta desta noite)"
              onClick={() => actions.onReceive(target)}
            >
              <HandCoins aria-hidden />
            </button>
            <button
              type="button"
              className="button-ghost button-sm"
              aria-label="Remarcar"
              title="Remarcar o dia de pagar"
              onClick={() => actions.onReschedule(target)}
            >
              <CalendarClock aria-hidden />
            </button>
          </>
        )}
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
 * O extrato do cliente (2026-10-25): o que deve, os pedidos em aberto (Ver, Receber, Remarcar),
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
                {fiadoOrderLabel(order)} · {formatMoney(order.amount)}
                <ViewButton order={order} onView={actions.onView} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
