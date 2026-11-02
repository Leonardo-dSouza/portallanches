import { canCancelPayment } from './payment-cancel';

const NIGHT = { businessDate: '2026-11-01', status: 'OPEN' } as const;
const CLOSED_NIGHT = { ...NIGHT, status: 'CLOSED' } as const;

describe('canCancelPayment (2026-11-01)', () => {
  it('o admin estorna qualquer recebimento, mesmo com a noite da tela fechada', () => {
    const old = { businessDate: '2026-10-01' };
    expect(canCancelPayment(old, 'ADMIN', CLOSED_NIGHT)).toBe(true);
  });

  it('o caixa estorna o recebimento da noite aberta na tela', () => {
    const own = { businessDate: '2026-11-01' };
    expect(canCancelPayment(own, 'CAIXA', NIGHT)).toBe(true);
  });

  it('o caixa não estorna recebimento de outra noite', () => {
    const old = { businessDate: '2026-10-31' };
    expect(canCancelPayment(old, 'CAIXA', NIGHT)).toBe(false);
  });

  it('o caixa não estorna com a noite fechada', () => {
    const own = { businessDate: '2026-11-01' };
    expect(canCancelPayment(own, 'CAIXA', CLOSED_NIGHT)).toBe(false);
  });
});
