import { BadRequestException } from '@nestjs/common';
import { parseOrderInput } from './order-input.js';

describe('parseOrderInput', () => {
  it('aceita pedido de balcão', () => {
    expect(
      parseOrderInput({ amount: 30, type: 'COUNTER', paymentMethodId: 1 }),
    ).toEqual({
      amount: '30.00',
      type: 'COUNTER',
      paymentMethodId: 1,
      customerId: null,
      deliveryFee: null,
    });
  });

  it('aceita entrega com cliente e sem sobrescrita de taxa', () => {
    const input = parseOrderInput({
      amount: '45.90',
      type: 'DELIVERY',
      paymentMethodId: 2,
      customerId: 3,
    });
    expect(input).toMatchObject({ customerId: 3, deliveryFee: null });
  });

  it('aceita sobrescrita da taxa, inclusive zero', () => {
    const input = parseOrderInput({
      amount: 20,
      type: 'DELIVERY',
      paymentMethodId: 1,
      customerId: 3,
      deliveryFee: 0,
    });
    expect(input.deliveryFee).toBe('0.00');
  });

  it('rejeita entrega sem cliente', () => {
    expect(() =>
      parseOrderInput({ amount: 20, type: 'DELIVERY', paymentMethodId: 1 }),
    ).toThrow(/customerId/);
  });

  it('rejeita balcão com cliente ou taxa', () => {
    const base = { amount: 20, type: 'COUNTER', paymentMethodId: 1 };
    expect(() => parseOrderInput({ ...base, customerId: 3 })).toThrow(
      BadRequestException,
    );
    expect(() => parseOrderInput({ ...base, deliveryFee: 3 })).toThrow(
      BadRequestException,
    );
  });

  it.each([null, 'texto', { type: 'OUTRO' }, { type: 'COUNTER', amount: 0 }])(
    'rejeita corpo inválido %j',
    (body) => {
      expect(() => parseOrderInput(body)).toThrow(BadRequestException);
    },
  );

  it('rejeita id de forma de pagamento não inteiro', () => {
    expect(() =>
      parseOrderInput({ amount: 1, type: 'COUNTER', paymentMethodId: '1' }),
    ).toThrow(/paymentMethodId/);
  });
});
