import { formatOrderTime } from './order-time';

describe('formatOrderTime', () => {
  it('a hora do lançamento no horário de Brasília, não no do navegador', () => {
    expect(formatOrderTime('2026-10-10T23:41:00Z')).toBe('20:41');
    expect(formatOrderTime('2026-10-11T03:05:00Z')).toBe('00:05');
  });
});
