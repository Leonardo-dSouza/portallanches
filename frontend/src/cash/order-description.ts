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

/**
 * Título do pop-up do pedido.
 *
 * @example orderTitle(entregaDaAna) // 'Entrega para Ana'
 */
export function orderTitle(order: Order): string {
  if (order.type === 'DELIVERY')
    return `Entrega para ${order.customerName ?? 'cliente'}`;
  return order.type === 'COUNTER' ? 'Balcão' : 'Pedido importado';
}
