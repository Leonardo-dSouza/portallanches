import { formatMoney, moneyToCents } from '../api/money';
import type { OrderFiado } from '../api/fiado-types';
import type { Order } from '../api/types';
import { formatDayMonth } from '../history/date-keys';
import { describeOrder } from './order-description';
import { isCanceled, isOpenAccount } from './order-filters';
import { isSplitOrder } from './split-payment';
import type { CashDay } from './use-cash-day';

/**
 * Tom da etiqueta (`data-tone` no CSS): `open` forte (o A pagar tem de vencer o Entregue verde),
 * `paid` discreto, `fiado-owing` tracejado (a caderneta) e `fiado-paid` com cara de pago.
 */
export type PaymentTagTone = 'open' | 'paid' | 'fiado-owing' | 'fiado-paid';

export interface PaymentTag {
  text: string;
  /** Linha pequena embaixo: a previsão do fiado devendo. */
  sub?: string;
  tone: PaymentTagTone;
}

/** @example fiadoDueText({ dueDate: '2026-10-30', … }) // 'pagar em 30/10' */
const fiadoDueText = (fiado: OrderFiado): string =>
  fiado.dueDate ? `pagar em ${formatDayMonth(fiado.dueDate)}` : 'sem data';

function fiadoTag(fiado: OrderFiado): PaymentTag {
  if (moneyToCents(fiado.remaining) === 0)
    return { text: 'Fiado · pago', tone: 'fiado-paid' };
  return {
    text: `Fiado · falta ${formatMoney(fiado.remaining)}`,
    sub: fiadoDueText(fiado),
    tone: 'fiado-owing',
  };
}

/**
 * A situação do pagamento numa etiqueta só, embaixo do valor (card 8, 2026-11-08; o pente fino
 * de 07/11 achou 5 de 7 contas A pagar marcadas Entregue antes de pagar). Null no cancelado (o
 * motivo fica embaixo do nome) e no importado da planilha sem forma.
 *
 * @example paymentTagOf(contaDaMaria, day) // { text: 'A pagar', tone: 'open' }
 */
export function paymentTagOf(
  order: Order,
  day: Pick<CashDay, 'paymentMethods' | 'zones'>,
): PaymentTag | null {
  if (isCanceled(order)) return null;
  if (isOpenAccount(order)) return { text: 'A pagar', tone: 'open' };
  if (order.paymentMethodId === null) return null;
  if (order.fiado) return fiadoTag(order.fiado);
  // Dividido (card 2): a etiqueta fica curta; as partes estão no pop-up.
  if (isSplitOrder(order)) return { text: 'Pago · dividido', tone: 'paid' };
  return { text: `Pago · ${describeOrder(order, day).method}`, tone: 'paid' };
}

/**
 * A linha tem a tecla Receber: o A pagar e o fiado com algo a pagar (não cancelados).
 *
 * @example canReceive(contaDaMaria) // true
 */
export function canReceive(order: Order): boolean {
  if (isCanceled(order)) return false;
  if (isOpenAccount(order)) return true;
  return order.fiado !== null && moneyToCents(order.fiado.remaining) > 0;
}
