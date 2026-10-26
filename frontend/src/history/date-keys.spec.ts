import { formatDayMonth } from './date-keys';

describe('formatDayMonth', () => {
  it('dia e mês, sem o ano', () => {
    expect(formatDayMonth('2026-10-07')).toBe('07/10');
  });
});
