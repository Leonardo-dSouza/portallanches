import { orderFixture } from '../test-support/order-fixture';
import {
  canRevert,
  elapsedLabel,
  nextStatus,
  showsElapsed,
  statusLabel,
  statusSteps,
} from './order-status-view';

describe('order-status-view', () => {
  it('rótulos do caixa', () => {
    expect(statusLabel('PREPARING')).toBe('Em preparo');
    expect(statusLabel('OUT_FOR_DELIVERY')).toBe('Saiu');
    expect(statusLabel('DELIVERED')).toBe('Entregue');
  });

  it('volta até Em preparo; importado não muda', () => {
    expect(canRevert(orderFixture({ status: 'PREPARING' }))).toBe(false);
    expect(canRevert(orderFixture({ status: 'DELIVERED' }))).toBe(true);
    const imported = orderFixture({ type: null, status: 'PREPARING' });
    expect(canRevert(imported)).toBe(false);
  });

  it('etapas por tipo e a próxima de cada pedido (2026-10-15)', () => {
    expect(statusSteps('COUNTER')).toEqual(['PREPARING', 'DELIVERED']);
    expect(statusSteps('DELIVERY')).toHaveLength(3);
    const delivery = orderFixture({ type: 'DELIVERY', status: 'PREPARING' });
    expect(nextStatus(delivery)).toBe('OUT_FOR_DELIVERY');
    expect(nextStatus({ ...delivery, status: 'OUT_FOR_DELIVERY' })).toBe(
      'DELIVERED',
    );
    expect(nextStatus(orderFixture({ type: 'COUNTER' }))).toBe('DELIVERED');
    expect(nextStatus(orderFixture({ status: 'DELIVERED' }))).toBeNull();
    expect(nextStatus(orderFixture({ type: null }))).toBeNull();
  });

  it('tempo na etapa: agora, minutos, horas; relógio adiantado vira agora', () => {
    const since = '2026-09-22T23:00:00Z';
    const at = (iso: string) => new Date(iso);
    expect(elapsedLabel(since, at('2026-09-22T23:00:40Z'))).toBe('agora');
    expect(elapsedLabel(since, at('2026-09-22T23:12:30Z'))).toBe('há 12 min');
    expect(elapsedLabel(since, at('2026-09-23T00:05:00Z'))).toBe('há 1 h 05');
    expect(elapsedLabel(since, at('2026-09-22T22:58:00Z'))).toBe('agora');
  });

  it('o tempo só aparece enquanto o pedido anda (2026-10-16)', () => {
    expect(showsElapsed(orderFixture({ status: 'PREPARING' }))).toBe(true);
    expect(
      showsElapsed(
        orderFixture({ type: 'DELIVERY', status: 'OUT_FOR_DELIVERY' }),
      ),
    ).toBe(true);
    expect(showsElapsed(orderFixture({ status: 'DELIVERED' }))).toBe(false);
    const canceled = orderFixture({ canceledAt: '2026-09-22T23:50:00Z' });
    expect(showsElapsed(canceled)).toBe(false);
    expect(showsElapsed(orderFixture({ type: null }))).toBe(false);
  });
});
