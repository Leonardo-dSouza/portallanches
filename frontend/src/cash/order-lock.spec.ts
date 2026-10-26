import { describe, expect, it } from 'vitest';
import { needsManager } from './order-lock';

const order = {
  status: 'PREPARING' as const,
  createdAt: '2026-09-22T23:00:00Z',
};
const at = (minutes: number) =>
  new Date(Date.parse(order.createdAt) + minutes * 60_000);

describe('needsManager', () => {
  it('caixa: livre em preparo nos minutos da trava; depois, ou fora de preparo, pede', () => {
    expect(needsManager(order, at(14), 15, 'CAIXA')).toBe(false);
    expect(needsManager(order, at(15), 15, 'CAIXA')).toBe(true);
    expect(
      needsManager({ ...order, status: 'DELIVERED' }, at(1), 15, 'CAIXA'),
    ).toBe(true);
    expect(needsManager(order, at(0), 0, 'CAIXA')).toBe(true);
  });

  it('o admin logado nunca precisa', () => {
    expect(needsManager(order, at(90), 15, 'ADMIN')).toBe(false);
  });

  it('sem status (o recebimento do fiado, 2026-10-25), só o tempo conta', () => {
    const payment = { createdAt: order.createdAt };
    expect(needsManager(payment, at(14), 15, 'CAIXA')).toBe(false);
    expect(needsManager(payment, at(15), 15, 'CAIXA')).toBe(true);
  });
});
