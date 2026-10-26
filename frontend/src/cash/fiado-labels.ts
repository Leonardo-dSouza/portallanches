import type { FiadoPayment, OrderFiado } from '../api/fiado-types';
import { formatMoney, moneyToCents } from '../api/money';
import type { Money, Order, PaymentMethod } from '../api/types';
import { formatDayLabel, formatDayMonth } from '../history/date-keys';
import { describePayment } from './payment-choice';

/**
 * O pedido fiado que o Receber e o Remarcar mostram (2026-10-25): a noite e o número, o cliente
 * e os valores. Vem dos fiados do dia, do extrato ou do próprio pedido da noite.
 */
export interface FiadoTarget {
  orderId: number;
  dayNumber: number;
  /** A noite do pedido. */
  businessDate: string;
  customerName: string;
  amount: Money;
  paidTotal: Money;
  remaining: Money;
  dueDate: string | null;
}

/**
 * Situação do fiado embaixo do nome, na lista: pago, quanto falta (quando já recebeu parte), a
 * previsão ou sem data.
 *
 * @example fiadoStatusText({ dueDate: '2026-10-30', paidTotal: '0.00', … }) // 'pagar em 30/10'
 */
export function fiadoStatusText(fiado: OrderFiado): string {
  if (moneyToCents(fiado.remaining) === 0) return 'pago';
  if (moneyToCents(fiado.paidTotal) > 0)
    return `falta ${formatMoney(fiado.remaining)}`;
  return fiado.dueDate
    ? `pagar em ${formatDayMonth(fiado.dueDate)}`
    : 'sem data';
}

/**
 * A previsão do fiado a cobrar na noite `today`: para hoje ou atrasado (de outra noite).
 *
 * @example dueStatusText('2026-10-25', '2026-10-26') // 'previsto 25/10, atrasado'
 */
export function dueStatusText(dueDate: string, today: string): string {
  if (dueDate === today) return 'previsto para hoje';
  return `previsto ${formatDayMonth(dueDate)}, atrasado`;
}

/**
 * Quanto entrou no recebimento e como (o adicional só quando tem).
 *
 * @example fiadoPaidText(recebimento, methods) // 'R$ 30,00 + adicional R$ 2,00 · Dinheiro'
 */
export function fiadoPaidText(
  payment: Pick<
    FiadoPayment,
    'amount' | 'extra' | 'paymentMethodId' | 'paymentMode'
  >,
  methods: PaymentMethod[],
): string {
  const method = methods.find((m) => m.id === payment.paymentMethodId);
  const extra =
    moneyToCents(payment.extra) > 0
      ? ` + adicional ${formatMoney(payment.extra)}`
      : '';
  return `${formatMoney(payment.amount)}${extra} · ${describePayment(method, payment.paymentMode)}`;
}

/**
 * O pedido pelo número e a noite, como o caixa acha na comanda de papel.
 *
 * @example fiadoOrderLabel({ dayNumber: 5, businessDate: '2026-09-20' }) // '#5 de dom 20/09'
 */
export function fiadoOrderLabel(
  order: Pick<FiadoTarget, 'dayNumber' | 'businessDate'>,
): string {
  return `#${order.dayNumber} de ${formatDayLabel(order.businessDate)}`;
}

/**
 * O pedido no topo do Receber e do Remarcar: número e noite, valor, o já pago e o que falta.
 *
 * @example fiadoSummary(target) // '#5 de dom 20/09 · R$ 50,00 · já pago R$ 3,00 · falta R$ 47,00'
 */
export function fiadoSummary(target: FiadoTarget): string {
  return `${fiadoOrderLabel(target)} · ${fiadoAmounts(target)}`;
}

/**
 * Os valores do pedido fiado: o total, o já pago (quando tem) e o que falta.
 *
 * @example fiadoAmounts(pedido) // 'R$ 50,00 · já pago R$ 3,00 · falta R$ 47,00'
 */
export function fiadoAmounts(
  order: Pick<FiadoTarget, 'amount' | 'paidTotal' | 'remaining'>,
): string {
  const paid = moneyToCents(order.paidTotal) > 0;
  return [
    formatMoney(order.amount),
    ...(paid ? [`já pago ${formatMoney(order.paidTotal)}`] : []),
    `falta ${formatMoney(order.remaining)}`,
  ].join(' · ');
}

/**
 * O pedido da noite como alvo do Receber; null fora do fiado.
 *
 * @example fiadoTargetOfOrder(order, '2026-10-26')?.remaining // '17.80'
 */
export function fiadoTargetOfOrder(
  order: Order,
  businessDate: string,
): FiadoTarget | null {
  if (!order.fiado) return null;
  return {
    orderId: order.id,
    dayNumber: order.dayNumber,
    businessDate,
    customerName: order.customerName ?? '',
    amount: order.amount,
    paidTotal: order.fiado.paidTotal,
    remaining: order.fiado.remaining,
    dueDate: order.fiado.dueDate,
  };
}
