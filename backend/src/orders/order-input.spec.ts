import { BadRequestException } from '@nestjs/common';
import { parseOrderInput } from './order-input.js';

const ITEMS = [{ productId: 9, quantity: 2 }];

describe('parseOrderInput', () => {
  it('aceita pedido de balcão', () => {
    expect(
      parseOrderInput({ items: ITEMS, type: 'COUNTER', paymentMethodId: 1 }),
    ).toEqual({
      items: [{ productId: 9, quantity: 2, note: null, addons: [] }],
      type: 'COUNTER',
      paymentMethodId: 1,
      paymentMode: null,
      customerId: null,
      deliveryFee: null,
      counterName: null,
      changeFor: null,
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
  ])('recusa itens inválidos %j', (items, message) => {
    expect(() =>
      parseOrderInput({ items, type: 'COUNTER', paymentMethodId: 1 }),
    ).toThrow(message);
  });
});

describe('parseOrderInput: conta aberta e troco (2026-10-10)', () => {
  const counter = { items: ITEMS, type: 'COUNTER' };
  const delivery = { items: ITEMS, type: 'DELIVERY', customerId: 3 };

  it('balcão aberto: paymentMethodId null com o nome (aparado)', () => {
    expect(
      parseOrderInput({
        ...counter,
        paymentMethodId: null,
        counterName: ' Maria ',
      }),
    ).toMatchObject({ paymentMethodId: null, counterName: 'Maria' });
  });

  it('aberto sem nome é recusado; nome vazio vira null no pedido pago', () => {
    expect(() =>
      parseOrderInput({ ...counter, paymentMethodId: null }),
    ).toThrow(/aberto.*"counterName"/);
    expect(
      parseOrderInput({ ...counter, paymentMethodId: 1, counterName: '  ' }),
    ).toMatchObject({ counterName: null });
  });

  it('aberto não leva o meio da maquininha; entrega não fica aberta', () => {
    const open = { ...counter, paymentMethodId: null, counterName: 'Maria' };
    expect(() => parseOrderInput({ ...open, paymentMode: 'PIX' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseOrderInput({ ...delivery, paymentMethodId: null }),
    ).toThrow(/entrega.*paymentMethodId/i);
  });

  it('nome do balcão até 40 caracteres e só no balcão', () => {
    expect(() =>
      parseOrderInput({
        ...counter,
        paymentMethodId: 1,
        counterName: 'x'.repeat(41),
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseOrderInput({ ...delivery, paymentMethodId: 1, counterName: 'Ana' }),
    ).toThrow(/counterName/);
  });

  it('troco só na entrega, como valor', () => {
    expect(
      parseOrderInput({ ...delivery, paymentMethodId: 1, changeFor: '50' }),
    ).toMatchObject({ changeFor: '50.00' });
    expect(() =>
      parseOrderInput({ ...counter, paymentMethodId: 1, changeFor: '50' }),
    ).toThrow(/changeFor/);
  });
});
