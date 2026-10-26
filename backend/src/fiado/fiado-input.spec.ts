import { BadRequestException } from '@nestjs/common';
import {
  parseFiadoDueDateInput,
  parseFiadoPaymentInput,
} from './fiado-input.js';

// Fiado (pedido do usuário, 2026-10-25): receber (parcial, com adicional) e remarcar.
describe('fiado-input', () => {
  it('recebimento: valor, adicional vazio = 0, forma, meio e data opcionais', () => {
    expect(parseFiadoPaymentInput({ amount: 20, paymentMethodId: 1 })).toEqual({
      amount: '20.00',
      extra: '0.00',
      paymentMethodId: 1,
      paymentMode: null,
      date: null,
    });
    expect(
      parseFiadoPaymentInput({
        amount: '20.5',
        extra: '5',
        paymentMethodId: 3,
        paymentMode: 'PIX',
        date: '2026-09-22',
      }),
    ).toEqual({
      amount: '20.50',
      extra: '5.00',
      paymentMethodId: 3,
      paymentMode: 'PIX',
      date: '2026-09-22',
    });
    expect(
      parseFiadoPaymentInput({ amount: 1, extra: '', paymentMethodId: 1 })
        .extra,
    ).toBe('0.00');
  });

  it('recebimento sem valor, com valor zero ou sem forma é recusado', () => {
    expect(() => parseFiadoPaymentInput({ paymentMethodId: 1 })).toThrow(
      /"amount"/,
    );
    expect(() =>
      parseFiadoPaymentInput({ amount: 0, paymentMethodId: 1 }),
    ).toThrow(/"amount".*0/);
    expect(() => parseFiadoPaymentInput({ amount: 10 })).toThrow(
      /"paymentMethodId"/,
    );
    expect(() =>
      parseFiadoPaymentInput({ amount: 10, paymentMethodId: 1, extra: -1 }),
    ).toThrow(BadRequestException);
  });

  it('remarcar: uma data ou null ("Sem data"); sem o campo é recusado', () => {
    expect(parseFiadoDueDateInput({ dueDate: '2026-09-30' })).toBe(
      '2026-09-30',
    );
    expect(parseFiadoDueDateInput({ dueDate: null })).toBeNull();
    expect(() => parseFiadoDueDateInput({})).toThrow(
      /"dueDate".*esperado data YYYY-MM-DD ou null/,
    );
    expect(() => parseFiadoDueDateInput({ dueDate: '30/09' })).toThrow(
      /"30\/09"/,
    );
  });
});
