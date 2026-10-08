import { comparisonRanges } from './period-comparison.js';

const TODAY = '2026-10-08';

describe('comparisonRanges', () => {
  it('mês em andamento: até hoje, contra o mesmo trecho do mês anterior', () => {
    expect(comparisonRanges('2026-10-01', '2026-10-31', TODAY)).toEqual({
      elapsedTo: '2026-10-08',
      previous: { from: '2026-09-01', to: '2026-09-08' },
    });
  });

  it('mês em andamento no dia 31: o mês anterior para no último dia dele', () => {
    expect(comparisonRanges('2026-10-01', '2026-10-31', '2026-10-31')).toEqual({
      elapsedTo: '2026-10-31',
      previous: { from: '2026-09-01', to: '2026-09-30' },
    });
    expect(
      comparisonRanges('2026-03-01', '2026-03-31', '2026-03-30').previous,
    ).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('mês que já terminou compara com o mês anterior inteiro', () => {
    expect(comparisonRanges('2026-09-01', '2026-09-30', TODAY)).toEqual({
      elapsedTo: '2026-09-30',
      previous: { from: '2026-08-01', to: '2026-08-31' },
    });
  });

  it('ano em andamento: até hoje, contra o ano passado até a mesma data', () => {
    expect(comparisonRanges('2026-01-01', '2026-12-31', TODAY)).toEqual({
      elapsedTo: '2026-10-08',
      previous: { from: '2025-01-01', to: '2025-10-08' },
    });
    expect(
      comparisonRanges('2028-01-01', '2028-12-31', '2028-02-29').previous,
    ).toEqual({ from: '2027-01-01', to: '2027-02-28' });
  });

  it('ano que já terminou compara com o ano anterior inteiro', () => {
    expect(
      comparisonRanges('2025-01-01', '2025-12-31', TODAY).previous,
    ).toEqual({ from: '2024-01-01', to: '2024-12-31' });
  });

  it('semana em andamento (terça a segunda, hoje quinta): terça a quinta da semana passada', () => {
    expect(comparisonRanges('2026-10-06', '2026-10-12', TODAY)).toEqual({
      elapsedTo: '2026-10-08',
      previous: { from: '2026-09-29', to: '2026-10-01' },
    });
  });

  it('intervalo que já terminou: o mesmo número de dias logo antes', () => {
    expect(comparisonRanges('2026-09-21', '2026-09-27', TODAY)).toEqual({
      elapsedTo: '2026-09-27',
      previous: { from: '2026-09-14', to: '2026-09-20' },
    });
  });

  it('um dia só compara com o mesmo dia da semana anterior', () => {
    expect(comparisonRanges('2026-09-25', '2026-09-25', TODAY)).toEqual({
      elapsedTo: '2026-09-25',
      previous: { from: '2026-09-18', to: '2026-09-18' },
    });
  });

  it('período todo no futuro não é cortado', () => {
    expect(comparisonRanges('2026-11-01', '2026-11-30', TODAY)).toEqual({
      elapsedTo: '2026-11-30',
      previous: { from: '2026-10-01', to: '2026-10-31' },
    });
  });
});
