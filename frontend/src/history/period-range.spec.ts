import { addDays, formatDayLabel, parseDateKey, toDateKey } from './date-keys';
import { presetRange, rangeError } from './period-range';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe('date-keys', () => {
  it('usa a data local, mesmo às 23h', () => {
    expect(toDateKey(new Date(2026, 8, 22, 23, 59))).toBe('2026-09-22');
  });

  it('recusa data inexistente e formato errado', () => {
    expect(parseDateKey('2026-02-30')).toBeNull();
    expect(parseDateKey('')).toBeNull();
    expect(parseDateKey('22/09/2026')).toBeNull();
  });

  it('soma dias na virada de ano e formata com dia da semana', () => {
    expect(toDateKey(addDays(at(2026, 12, 30), 3))).toBe('2027-01-02');
    expect(formatDayLabel('2026-09-22')).toBe('ter 22/09');
  });
});

describe('presetRange', () => {
  it('semana: terça a segunda, e na segunda volta 6 dias', () => {
    expect(presetRange('week', at(2026, 9, 23))).toEqual({
      from: '2026-09-22',
      to: '2026-09-28',
    });
    expect(presetRange('week', at(2026, 9, 22)).from).toBe('2026-09-22');
    expect(presetRange('week', at(2026, 9, 21)).from).toBe('2026-09-15');
  });

  it('mês: primeiro ao último dia, inclusive fevereiro bissexto', () => {
    expect(presetRange('month', at(2026, 9, 22))).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(presetRange('month', at(2028, 2, 10)).to).toBe('2028-02-29');
  });

  it('ano: 1º de janeiro a 31 de dezembro, sempre aceito pela API', () => {
    const range = presetRange('year', at(2028, 5, 1));
    expect(range).toEqual({ from: '2028-01-01', to: '2028-12-31' });
    expect(rangeError(range)).toBeNull();
  });
});

describe('rangeError', () => {
  it('aceita intervalo válido, inclusive de um dia', () => {
    expect(rangeError({ from: '2026-09-22', to: '2026-09-22' })).toBeNull();
  });

  it('recusa data vazia, invertida e acima de 366 dias, citando o valor', () => {
    expect(rangeError({ from: '', to: '2026-09-22' })).toContain('""');
    expect(rangeError({ from: '2026-09-30', to: '2026-09-01' })).toContain(
      '2026-09-01',
    );
    expect(rangeError({ from: '2026-01-01', to: '2027-01-02' })).toContain(
      '366',
    );
  });
});
