import type { DeliveryZone, Order, PaymentMethod } from '../api/types';
import { describeOrder, orderTitle } from './order-description';

const TON: PaymentMethod = {
  id: 3,
  name: 'Maquininha Ton',
  active: true,
  sortOrder: 3,
  isCardTerminal: true,
  isCash: false,
};
const CENTRO: DeliveryZone = {
  id: 7,
  neighborhood: 'Centro',
  neighborhoodKey: 'centro',
  fee: '5.00',
  active: true,
};
const DAY = { paymentMethods: [TON], zones: [CENTRO] };

const order = (fields: Partial<Order>): Order => ({
  id: 1,
  amount: '20.00',
  items: [],
  type: 'COUNTER',
  paymentMethodId: null,
  paymentMode: null,
  deliveryZoneId: null,
  deliveryFee: null,
  customerId: null,
  customerName: null,
  customerPhone: null,
  customerStreet: null,
  customerNumber: null,
  customerReference: null,
  ...fields,
});

describe('describeOrder', () => {
  it('a forma com o meio da maquininha e o bairro da entrega', () => {
    const delivery = order({
      type: 'DELIVERY',
      paymentMethodId: 3,
      paymentMode: 'CREDIT',
      deliveryZoneId: 7,
    });
    expect(describeOrder(delivery, DAY)).toEqual({
      method: 'Maquininha Ton · Crédito',
      neighborhood: 'Centro',
    });
  });

  it('sem forma ou sem bairro conhecidos mostra um traço', () => {
    expect(describeOrder(order({}), DAY)).toEqual({
      method: '—',
      neighborhood: '—',
    });
  });
});

describe('orderTitle', () => {
  it('balcão, entrega com o cliente e o importado da planilha', () => {
    expect(orderTitle(order({}))).toBe('Balcão');
    expect(orderTitle(order({ type: 'DELIVERY', customerName: 'Ana' }))).toBe(
      'Entrega para Ana',
    );
    expect(orderTitle(order({ type: null }))).toBe('Pedido importado');
  });
});
