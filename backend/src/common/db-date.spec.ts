import { fromDbDate, toDbDate } from './db-date.js';

describe('db-date', () => {
  it('grava o dia como meia-noite UTC (coluna DATE)', () => {
    expect(toDbDate('2026-10-09').toISOString()).toBe(
      '2026-10-09T00:00:00.000Z',
    );
  });

  it('lê a coluna DATE de volta como YYYY-MM-DD', () => {
    expect(fromDbDate(new Date('2026-10-09T00:00:00Z'))).toBe('2026-10-09');
  });
});
