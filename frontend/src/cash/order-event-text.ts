import { formatMoney } from '../api/money';
import type {
  FiadoPaymentSnapshot,
  OrderEvent,
  OrderSnapshot,
} from '../api/order-event-types';
import type { PaymentMethod } from '../api/types';
import { formatDayMonth } from '../history/date-keys';
import { fiadoPaidText } from './fiado-labels';
import { itemsChangeText } from './order-items-diff';
import { statusLabel } from './order-status-view';
import { describePayment } from './payment-choice';
import { describePaymentPart, isSplitOrder } from './split-payment';

const ROLE_LABEL = { CAIXA: 'caixa', ADMIN: 'admin' } as const;

function paymentOf(snapshot: OrderSnapshot, methods: PaymentMethod[]): string {
  // Dividido (card 2): as partes com o valor; eventos antigos não têm o campo.
  if (snapshot.paymentParts && isSplitOrder(snapshot))
    return snapshot.paymentParts
      .map((part) => describePaymentPart(part, methods))
      .join(' + ');
  if (snapshot.paymentMethodId === null) return 'A pagar';
  const method = methods.find((m) => m.id === snapshot.paymentMethodId);
  return describePayment(method, snapshot.paymentMode);
}

/** "rótulo antes → depois", ou null quando não mudou. */
function changedPair(label: string, was: string, now: string): string | null {
  return was === now ? null : `${label} ${was} → ${now}`;
}

/**
 * Só o que mudou: os itens que entraram, saíram ou mudaram de quantidade (2026-11-10: antes a
 * lista inteira aparecia duas vezes), depois o valor e o pagamento, cada um com o rótulo.
 */
function changes(
  before: OrderSnapshot,
  after: OrderSnapshot,
  methods: PaymentMethod[],
): string {
  const parts = [
    itemsChangeText(before.items, after.items),
    changedPair('valor', formatMoney(before.amount), formatMoney(after.amount)),
    changedPair(
      'pagamento',
      paymentOf(before, methods),
      paymentOf(after, methods),
    ),
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) return 'sem mudança de valor, pagamento ou itens';
  return parts.join(' · ');
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
 * @example eventText(evento, methods) // 'Alterado: entrou 1× Coca Cola 600ml · valor R$ 86,90 → R$ 94,90 (caixa)'
 */
export function eventText(event: OrderEvent, methods: PaymentMethod[]): string {
  const who = ROLE_LABEL[event.userRole];
  const by = event.managerAuthorized ? `${who}, com a senha do admin` : who;
  return `${detailsText(event, methods)} (${by})`;
}
