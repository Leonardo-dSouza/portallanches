import { centsToMoney, moneyToCents } from '../api/money';
import type { DeliveryZone, Order, PaymentMethod } from '../api/types';
import { describePayment } from './payment-choice';

/** O que a descrição do pedido precisa do dia do caixa. */
interface DayCatalog {
  paymentMethods: PaymentMethod[];
  zones: DeliveryZone[];
}

/**
 * Forma de pagamento (com o meio da maquininha) e bairro do pedido, como a lista e o pop-up
 * mostram.
 *
 * @example describeOrder(order, day) // { method: 'PIX', neighborhood: 'Centro' }
 */
export function describeOrder(order: Order, day: DayCatalog) {
  const method = day.paymentMethods.find((m) => m.id === order.paymentMethodId);
  const zone = day.zones.find((z) => z.id === order.deliveryZoneId);
  return {
    method: describePayment(method, order.paymentMode),
    neighborhood: zone?.neighborhood ?? '—',
  };
}

function titleWithoutNumber(order: Order): string {
  if (order.type === 'DELIVERY')
    return `Entrega para ${order.customerName ?? 'cliente'}`;
  if (order.type === null) return 'Pedido importado';
  return order.customerName ? `Balcão: ${order.customerName}` : 'Balcão';
}

/**
 * Pagamento como a lista, o pop-up e a Análise mostram: a conta aberta paga no fim.
 *
 * @example paymentText(contaDaMaria, day) // 'Aberto (paga no fim)'
 */
export function paymentText(order: Order, day: DayCatalog): string {
  // Conta aberta: balcão sem forma (o importado da planilha também não tem, mas sem tipo).
  if (order.type === 'COUNTER' && order.paymentMethodId === null)
    return 'Aberto (paga no fim)';
  return describeOrder(order, day).method;
}

/**
 * Título do pop-up do pedido, com o número do dia.
 *
 * @example orderTitle(entregaDaAna) // '#12 Entrega para Ana'
 */
export function orderTitle(order: Order): string {
  return `#${order.dayNumber} ${titleWithoutNumber(order)}`;
}

/**
 * O que o motoboy leva de troco (só para mostrar; o total vem da API).
 *
 * @example changeToCarry('100.00', '57.80') // '42.20'
 */
export function changeToCarry(changeFor: string, amount: string): string {
  return centsToMoney(moneyToCents(changeFor) - moneyToCents(amount));
}
