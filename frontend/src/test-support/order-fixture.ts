import type { Order } from '../api/types';

/**
 * Pedido gravado de balcão, pago em PIX, para os specs montarem o que precisam por cima.
 *
 * @example orderFixture({ type: 'DELIVERY', customerName: 'Ana' })
 */
export function orderFixture(fields: Partial<Order> = {}): Order {
  return {
    id: 1,
    dayNumber: 1,
    status: 'PREPARING',
    createdAt: '2026-09-22T23:41:00Z',
    amount: '20.00',
    items: [],
    type: 'COUNTER',
    paymentMethodId: 1,
    paymentMode: null,
    deliveryZoneId: null,
    deliveryFee: null,
    changeFor: null,
    customerId: null,
    customerName: null,
    customerPhone: null,
    customerStreet: null,
    customerNumber: null,
    customerReference: null,
    ...fields,
  };
}
