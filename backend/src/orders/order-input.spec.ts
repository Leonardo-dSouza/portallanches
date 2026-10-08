import { BadRequestException } from '@nestjs/common';
import { parseOrderInput } from './order-input.js';

const ITEMS = [{ productId: 9, quantity: 2 }];

describe('parseOrderInput', () => {
  it('aceita pedido de balcão', () => {
    expect(
      parseOrderInput({ items: ITEMS, type: 'COUNTER', paymentMethodId: 1 }),
    ).toEqual({
      items: [{ productId: 9, quantity: 2 }],
      type: 'COUNTER',
      paymentMethodId: 1,
      paymentMode: null,
      customerId: null,
      deliveryFee: null,
    });
  });

  it('aceita o meio da maquininha e recusa meio desconhecido', () => {
    const base = { items: ITEMS, type: 'COUNTER', paymentMethodId: 3 };
    expect(parseOrderInput({ ...base, paymentMode: 'DEBIT' })).toMatchObject({
      paymentMode: 'DEBIT',
    });
    expect(() => parseOrderInput({ ...base, paymentMode: 'VOUCHER' })).toThrow(
      /paymentMode.*"VOUCHER".*"CREDIT" ou "DEBIT" ou "PIX"/,
    );
  });

  it('aceita entrega com cliente e sem sobrescrita de taxa', () => {
    const input = parseOrderInput({
      items: ITEMS,
      type: 'DELIVERY',
      paymentMethodId: 2,
      customerId: 3,
    });
    expect(input).toMatchObject({ customerId: 3, deliveryFee: null });
  });

  it('aceita sobrescrita da taxa, inclusive zero', () => {
    const input = parseOrderInput({
      items: ITEMS,
      type: 'DELIVERY',
      paymentMethodId: 1,
      customerId: 3,
      deliveryFee: 0,
    });
    expect(input.deliveryFee).toBe('0.00');
  });

  it('rejeita entrega sem cliente', () => {
    expect(() =>
      parseOrderInput({ items: ITEMS, type: 'DELIVERY', paymentMethodId: 1 }),
    ).toThrow(/customerId/);
  });

  it('rejeita balcão com cliente ou taxa', () => {
    const base = { items: ITEMS, type: 'COUNTER', paymentMethodId: 1 };
    expect(() => parseOrderInput({ ...base, customerId: 3 })).toThrow(
      BadRequestException,
    );
    expect(() => parseOrderInput({ ...base, deliveryFee: 3 })).toThrow(
      BadRequestException,
    );
  });

  it.each([null, 'texto', { type: 'OUTRO' }, { type: 'COUNTER', items: [] }])(
    'rejeita corpo inválido %j',
    (body) => {
      expect(() => parseOrderInput(body)).toThrow(BadRequestException);
    },
  );

  it('rejeita id de forma de pagamento não inteiro', () => {
    expect(() =>
      parseOrderInput({ items: ITEMS, type: 'COUNTER', paymentMethodId: '1' }),
    ).toThrow(/paymentMethodId/);
  });

  it('recusa "amount": o total vem dos itens', () => {
    expect(() =>
      parseOrderInput({
        amount: 30,
        items: ITEMS,
        type: 'COUNTER',
        paymentMethodId: 1,
      }),
    ).toThrow(/"amount" não é aceito: recebido 30/);
  });

  it.each([
    [[], /"items".*de 1 a 50 linhas/],
    [
      [{ productId: 9, quantity: 0 }],
      /items\[0\]\.quantity.*inteiro de 1 a 99/,
    ],
    [[{ productId: 9, quantity: 1.5 }], /items\[0\]\.quantity/],
    [[{ productId: 9, quantity: 100 }], /items\[0\]\.quantity/],
    [[{ productId: 'x', quantity: 1 }], /items\[0\]\.productId/],
    [
      [
        { productId: 9, quantity: 1 },
        { productId: 9, quantity: 2 },
      ],
      /produto 9 repetido/,
    ],
  ])('recusa itens inválidos %j', (items, message) => {
    expect(() =>
      parseOrderInput({ items, type: 'COUNTER', paymentMethodId: 1 }),
    ).toThrow(message);
  });
});
