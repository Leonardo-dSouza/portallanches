import { isLockedForCashier, isSensitiveEdit } from './order-lock.js';

const LAUNCHED = new Date('2026-09-22T23:00:00Z');
const after = (minutes: number) =>
  new Date(LAUNCHED.getTime() + minutes * 60_000);
const preparing = { status: 'PREPARING' as const, createdAt: LAUNCHED };

describe('isLockedForCashier', () => {
  it('em preparo e dentro dos minutos: o caixa resolve sozinho', () => {
    expect(isLockedForCashier(preparing, after(14), 15)).toBe(false);
  });

  it('passou dos minutos, mesmo em preparo: trava (fecha a brecha do "Em preparo" para sempre)', () => {
    expect(isLockedForCashier(preparing, after(15), 15)).toBe(true);
  });

  it('saiu ou foi entregue: trava, mesmo no primeiro minuto', () => {
    const out = { ...preparing, status: 'OUT_FOR_DELIVERY' as const };
    expect(isLockedForCashier(out, after(1), 15)).toBe(true);
    const done = { ...preparing, status: 'DELIVERED' as const };
    expect(isLockedForCashier(done, after(1), 15)).toBe(true);
  });

  it('0 minuto: sempre pede a senha do admin', () => {
    expect(isLockedForCashier(preparing, LAUNCHED, 0)).toBe(true);
  });

  it('recebimento de fiado (sem status): só o tempo conta (2026-10-25)', () => {
    const payment = { createdAt: LAUNCHED };
    expect(isLockedForCashier(payment, after(14), 15)).toBe(false);
    expect(isLockedForCashier(payment, after(15), 15)).toBe(true);
  });
});

describe('isSensitiveEdit', () => {
  const before = { amount: '30.00', paymentMethodId: 1 };

  it('baixar o valor ou trocar a forma mexe no dinheiro', () => {
    expect(isSensitiveEdit(before, { ...before, amount: '29.99' })).toBe(true);
    expect(isSensitiveEdit(before, { ...before, paymentMethodId: 2 })).toBe(
      true,
    );
  });

  it('acrescentar, manter o valor ou dar forma ao "A pagar" é livre', () => {
    expect(isSensitiveEdit(before, { ...before, amount: '37.00' })).toBe(false);
    expect(isSensitiveEdit(before, before)).toBe(false);
    const open = { amount: '30.00', paymentMethodId: null };
    expect(isSensitiveEdit(open, { ...open, paymentMethodId: 2 })).toBe(false);
  });
});
