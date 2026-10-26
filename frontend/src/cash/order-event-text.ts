import { formatMoney } from '../api/money';
import type {
  FiadoPaymentSnapshot,
  OrderEvent,
  OrderSnapshot,
} from '../api/order-event-types';
import type { PaymentMethod } from '../api/types';
import { formatDayMonth } from '../history/date-keys';
import { fiadoPaidText } from './fiado-labels';
import { statusLabel } from './order-status-view';
import { describePayment } from './payment-choice';

const ROLE_LABEL = { CAIXA: 'caixa', ADMIN: 'admin' } as const;

function paymentOf(snapshot: OrderSnapshot, methods: PaymentMethod[]): string {
  if (snapshot.paymentMethodId === null) return 'A pagar';
  const method = methods.find((m) => m.id === snapshot.paymentMethodId);
  return describePayment(method, snapshot.paymentMode);
}

/** "antes → depois" só do que mudou: valor, pagamento e itens. */
function changes(
  before: OrderSnapshot,
  after: OrderSnapshot,
  methods: PaymentMethod[],
): string {
  const pairs: [string, string][] = [
    [formatMoney(before.amount), formatMoney(after.amount)],
    [paymentOf(before, methods), paymentOf(after, methods)],
    [before.items, after.items],
  ];
  const changed = pairs.filter(([was, now]) => was !== now);
  if (changed.length === 0) return 'sem mudança de valor, pagamento ou itens';
  return changed.map(([was, now]) => `${was} → ${now}`).join(' · ');
}

/** O recebimento do fiado: valor (+ adicional), a forma e a noite em que entrou na gaveta. */
function fiadoPaymentText(
  payment: FiadoPaymentSnapshot,
  methods: PaymentMethod[],
): string {
  return `${fiadoPaidText(payment, methods)} · noite de ${formatDayMonth(payment.businessDate)}`;
}

const dueText = (date: string | null) =>
  date ? formatDayMonth(date) : 'sem data';

/** Os três passos do fiado (2026-10-25); null nos outros. */
function fiadoText(
  details: OrderEvent['details'],
  methods: PaymentMethod[],
): string | null {
  if (details.kind === 'FIADO_PAYMENT')
    return `Recebido do fiado: ${fiadoPaymentText(details.payment, methods)}`;
  if (details.kind === 'FIADO_PAYMENT_CANCELED')
    return `Recebimento estornado: ${fiadoPaymentText(details.payment, methods)} · ${details.reason}`;
  if (details.kind === 'FIADO_DUE_DATE')
    return `Pagar em: ${dueText(details.from)} → ${dueText(details.to)}`;
  return null;
}

function detailsText(event: OrderEvent, methods: PaymentMethod[]): string {
  const { details } = event;
  if (details.kind === 'CREATED') {
    const { order } = details;
    return `Lançado: ${formatMoney(order.amount)} · ${paymentOf(order, methods)} · ${order.items}`;
  }
  if (details.kind === 'EDITED')
    return `Alterado: ${changes(details.before, details.after, methods)}`;
  if (details.kind === 'STATUS')
    return `${statusLabel(details.from)} → ${statusLabel(details.to)}`;
  if (details.kind === 'CANCELED') return `Cancelado: ${details.reason}`;
  return fiadoText(details, methods) ?? 'Cancelamento desfeito';
}

/**
 * Um passo do histórico do pedido em uma linha, com o perfil e a senha do admin quando usada.
 *
 * @example eventText(evento, methods) // 'Alterado: R$ 35,60 → R$ 17,80 · PIX → Dinheiro (caixa, com a senha do admin)'
 */
export function eventText(event: OrderEvent, methods: PaymentMethod[]): string {
  const who = ROLE_LABEL[event.userRole];
  const by = event.managerAuthorized ? `${who}, com a senha do admin` : who;
  return `${detailsText(event, methods)} (${by})`;
}
