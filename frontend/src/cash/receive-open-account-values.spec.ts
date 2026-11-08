import { describe, expect, it } from 'vitest';
import type { PaymentMethod } from '../api/types';
import { openAccountsSummary } from './open-accounts';
import {
  buildOpenAccountPayment,
  EMPTY_OPEN_ACCOUNT_PAYMENT,
  isCashChoice,
} from './receive-open-account-values';
import { orderFixture } from '../test-support/order-fixture';

const method = (
  id: number,
  name: string,
  flags: Partial<PaymentMethod> = {},
): PaymentMethod => ({
  id,
  name,
  active: true,
  sortOrder: id,
  isCardTerminal: false,
  isCash: false,
  isFiado: false,
  ...flags,
});

const METHODS = [
  method(1, 'PIX'),
  method(2, 'Dinheiro', { isCash: true }),
  method(3, 'Ton', { isCardTerminal: true }),
];

describe('buildOpenAccountPayment', () => {
  it('sem forma pede a tecla', () => {
    expect(
      buildOpenAccountPayment(EMPTY_OPEN_ACCOUNT_PAYMENT, METHODS),
    ).toEqual({
      ok: false,
      error: 'Escolha a forma do pagamento (teclas 1 a 3)',
    });
  });

  it('dinheiro leva o troco; vazio = sem troco', () => {
    const cash = { ...EMPTY_OPEN_ACCOUNT_PAYMENT, paymentMethodId: '2' };
    expect(
      buildOpenAccountPayment({ ...cash, changeFor: '50' }, METHODS),
    ).toEqual({ ok: true, input: { paymentMethodId: 2, changeFor: '50.00' } });
    expect(buildOpenAccountPayment(cash, METHODS)).toEqual({
      ok: true,
      input: { paymentMethodId: 2 },
    });
  });

  it('troco inválido recusa com o valor digitado; fora do dinheiro o troco é ignorado', () => {
    const typed = { ...EMPTY_OPEN_ACCOUNT_PAYMENT, changeFor: 'abc' };
    expect(
      buildOpenAccountPayment({ ...typed, paymentMethodId: '2' }, METHODS),
    ).toMatchObject({ ok: false, error: expect.stringContaining('"abc"') });
    expect(
      buildOpenAccountPayment({ ...typed, paymentMethodId: '1' }, METHODS),
    ).toEqual({ ok: true, input: { paymentMethodId: 1 } });
  });

  it('maquininha exige o meio', () => {
    const ton = { ...EMPTY_OPEN_ACCOUNT_PAYMENT, paymentMethodId: '3' };
    expect(buildOpenAccountPayment(ton, METHODS).ok).toBe(false);
    expect(
      buildOpenAccountPayment({ ...ton, paymentMode: 'DEBIT' }, METHODS),
    ).toEqual({
      ok: true,
      input: { paymentMethodId: 3, paymentMode: 'DEBIT' },
    });
  });

  it('isCashChoice só no dinheiro', () => {
    expect(isCashChoice({ paymentMethodId: '2' }, METHODS)).toBe(true);
    expect(isCashChoice({ paymentMethodId: '1' }, METHODS)).toBe(false);
  });
});

describe('openAccountsSummary', () => {
  it('soma só o A pagar não cancelado', () => {
    const orders = [
      orderFixture({ id: 1, paymentMethodId: null, amount: '35.20' }),
      orderFixture({ id: 2, paymentMethodId: null, amount: '4.80' }),
      orderFixture({
        id: 3,
        paymentMethodId: null,
        amount: '9.00',
        canceledAt: '2026-10-10T23:00:00Z',
      }),
      orderFixture({ id: 4, amount: '12.00' }),
    ];
    expect(openAccountsSummary(orders)).toEqual({ count: 2, total: '40.00' });
  });
});
