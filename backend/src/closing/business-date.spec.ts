import { BadRequestException } from '@nestjs/common';
import {
  dayGroupOf,
  parseBusinessDate,
  parseDateRange,
  toBusinessDate,
} from './business-date.js';

describe('business-date', () => {
  it('formata a data no fuso da lanchonete com zeros à esquerda', () => {
    expect(toBusinessDate(new Date('2026-01-05T15:00:00Z'))).toBe('2026-01-05');
  });

  it('regressão: 22h de domingo em Brasília (01h UTC de segunda) ainda é domingo', () => {
    const sundayNight = new Date('2026-09-21T01:17:00Z');
    expect(toBusinessDate(sundayNight)).toBe('2026-09-20');
    expect(toBusinessDate(sundayNight, 'UTC')).toBe('2026-09-21');
  });

  it('aceita data válida', () => {
    expect(parseBusinessDate('2026-09-22')).toBe('2026-09-22');
  });

  it.each(['22/09/2026', '2026-13-01', 'abc'])('rejeita "%s"', (raw) => {
    expect(() => parseBusinessDate(raw)).toThrow(BadRequestException);
  });

  it('agrupa terça a quinta e sexta a domingo', () => {
    expect(dayGroupOf('2026-09-22')).toBe('TUE_THU');
    expect(dayGroupOf('2026-09-24')).toBe('TUE_THU');
    expect(dayGroupOf('2026-09-25')).toBe('FRI_SUN');
    expect(dayGroupOf('2026-09-27')).toBe('FRI_SUN');
    expect(dayGroupOf('2026-09-21')).toBe('FRI_SUN'); // segunda
  });
});

describe('parseDateRange', () => {
  it('aceita intervalo válido, inclusive de um dia só', () => {
    expect(parseDateRange('2026-09-01', '2026-09-30')).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(parseDateRange('2026-09-01', '2026-09-01').to).toBe('2026-09-01');
  });

  it.each([
    [undefined, '2026-09-30', /"from" obrigatório/],
    ['2026-09-01', undefined, /"to" obrigatório/],
    ['2026-09-30', '2026-09-01', /from <= to/],
    ['2026-01-01', '2027-01-02', /máximo 366|no máximo 366/],
    ['2026-13-01', '2026-09-01', /Data inválida/],
  ])('rejeita %s..%s', (from, to, message) => {
    expect(() => parseDateRange(from, to)).toThrow(message);
  });

  it('aceita exatamente 366 dias', () => {
    expect(parseDateRange('2026-01-01', '2027-01-01').to).toBe('2027-01-01');
  });
});
