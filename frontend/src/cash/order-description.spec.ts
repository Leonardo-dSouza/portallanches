import type { DeliveryZone, Order, PaymentMethod } from '../api/types';
import { orderFixture } from '../test-support/order-fixture';
import { changeToCarry, describeOrder, orderTitle } from './order-description';

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

const order = (fields: Partial<Order>) =>
  orderFixture({ paymentMethodId: null, ...fields });

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
  it('o número do dia com o balcão (e o nome), a entrega com o cliente e o importado', () => {
    expect(orderTitle(order({ dayNumber: 3 }))).toBe('#3 Balcão');
    expect(orderTitle(order({ dayNumber: 4, customerName: 'Maria' }))).toBe(
      '#4 Balcão: Maria',
    );
    expect(orderTitle(order({ type: 'DELIVERY', customerName: 'Ana' }))).toBe(
      '#1 Entrega para Ana',
    );
    expect(orderTitle(order({ type: null }))).toBe('#1 Pedido importado');
  });
});

describe('changeToCarry', () => {
  it('o que o motoboy leva de troco: "Troco para" menos o total', () => {
    expect(changeToCarry('100.00', '57.80')).toBe('42.20');
  });
});
