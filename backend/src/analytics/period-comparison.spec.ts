import { previousRange } from './period-comparison.js';

describe('previousRange', () => {
  it('mês cheio compara com o mês anterior inteiro', () => {
    expect(previousRange('2026-10-01', '2026-10-31')).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(previousRange('2026-03-01', '2026-03-31')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
  });

  it('ano cheio compara com o ano anterior inteiro', () => {
    expect(previousRange('2028-01-01', '2028-12-31')).toEqual({
      from: '2027-01-01',
      to: '2027-12-31',
    });
  });

  it('outros intervalos: o mesmo número de dias logo antes', () => {
    expect(previousRange('2026-09-21', '2026-09-27')).toEqual({
      from: '2026-09-14',
      to: '2026-09-20',
    });
  });

  it('um dia só compara com o mesmo dia da semana anterior', () => {
    expect(previousRange('2026-09-25', '2026-09-25')).toEqual({
      from: '2026-09-18',
      to: '2026-09-18',
    });
  });
});
