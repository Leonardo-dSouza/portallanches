import type {
  AnalyticsItemRow,
  AnalyticsOrderRow,
} from './analytics-source.js';

/** Item vendido para os testes: 1 unidade a R$ 10,00 de "Tradicional", salvo o que vier. */
export const soldItem = (
  productId: number,
  productName: string,
  fields: Partial<AnalyticsItemRow> = {},
): AnalyticsItemRow => ({
  productId,
  productName,
  categoryName: 'Tradicional',
  quantity: 1,
  unitPrice: '10.00',
  ...fields,
});

/** Pedido de balcão no fechamento 1, pago no PIX (id 1), salvo o que vier. */
export const analyticsOrder = (
  amount: string,
  fields: Partial<AnalyticsOrderRow> = {},
): AnalyticsOrderRow => ({
  closingId: 1,
  amount,
  type: 'COUNTER',
  paymentMethodId: 1,
  paymentMode: null,
  deliveryFee: '0.00',
  neighborhood: null,
  customerId: null,
  customerName: null,
  items: [],
  ...fields,
});

/** Entrega no bairro e para o cliente informados (taxa de R$ 5,00). */
export const deliveryOrder = (
  amount: string,
  neighborhood: string,
  customer: { id: number; name: string },
  fields: Partial<AnalyticsOrderRow> = {},
): AnalyticsOrderRow =>
  analyticsOrder(amount, {
    type: 'DELIVERY',
    deliveryFee: '5.00',
    neighborhood,
    customerId: customer.id,
    customerName: customer.name,
    ...fields,
  });
