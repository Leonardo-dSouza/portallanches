import { orderFixture } from '../test-support/order-fixture';
import { canAdvance, canRevert, statusLabel } from './order-status-view';

describe('order-status-view', () => {
  it('rótulos do caixa', () => {
    expect(statusLabel('PREPARING')).toBe('Em preparo');
    expect(statusLabel('OUT_FOR_DELIVERY')).toBe('Saiu');
    expect(statusLabel('DELIVERED')).toBe('Entregue');
  });

  it('avança até Entregue e volta até Em preparo; importado não muda', () => {
    expect(canAdvance(orderFixture({ status: 'PREPARING' }))).toBe(true);
    expect(canAdvance(orderFixture({ status: 'DELIVERED' }))).toBe(false);
    expect(canRevert(orderFixture({ status: 'PREPARING' }))).toBe(false);
    expect(canRevert(orderFixture({ status: 'DELIVERED' }))).toBe(true);
    const imported = orderFixture({ type: null, status: 'PREPARING' });
    expect([canAdvance(imported), canRevert(imported)]).toEqual([false, false]);
  });
});
