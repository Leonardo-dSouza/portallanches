import { BadRequestException } from '@nestjs/common';
import { parseOpenAccountPayment } from './order-payment-input.js';

describe('parseOpenAccountPayment', () => {
  it('aceita pagamento com forma única sem partes', () => {
    const parsed = parseOpenAccountPayment({
      paymentMethodId: 1,
      changeFor: '50.00',
    });
    expect(parsed).toEqual({
      paymentMethodId: 1,
      paymentMode: null,
      changeFor: '50.00',
      paymentParts: [],
    });
  });

  it('aceita pagamento com partes e deriva a 1ª forma', () => {
    const parsed = parseOpenAccountPayment({
      paymentParts: [
        { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '20.00' },
        { paymentMethodId: 1, amount: '30.00' },
      ],
      changeFor: '50.00',
    });
    expect(parsed.paymentMethodId).toBe(3);
    expect(parsed.paymentMode).toBe('DEBIT');
    expect(parsed.changeFor).toBe('50.00');
    expect(parsed.paymentParts).toEqual([
      { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '20.00' },
      { paymentMethodId: 1, paymentMode: null, amount: '30.00' },
    ]);
  });

  it('recusa partes com paymentMethodId informado junto', () => {
    expect(() =>
      parseOpenAccountPayment({
        paymentParts: [
          { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '20.00' },
          { paymentMethodId: 1, amount: '30.00' },
        ],
        paymentMethodId: 1,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseOpenAccountPayment({
        paymentParts: [
          { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '20.00' },
          { paymentMethodId: 1, amount: '30.00' },
        ],
        paymentMethodId: 1,
      }),
    ).toThrow(
      'Recebimento com "paymentParts" não aceita "paymentMethodId" nem "paymentMode"',
    );
  });

  it('recusa partes com paymentMode informado junto', () => {
    expect(() =>
      parseOpenAccountPayment({
        paymentParts: [
          { paymentMethodId: 3, paymentMode: 'DEBIT', amount: '20.00' },
          { paymentMethodId: 1, amount: '30.00' },
        ],
        paymentMode: 'DEBIT',
      }),
    ).toThrow(
      'Recebimento com "paymentParts" não aceita "paymentMethodId" nem "paymentMode"',
    );
  });
});
