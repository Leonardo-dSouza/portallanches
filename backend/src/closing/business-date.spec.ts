import { BadRequestException } from '@nestjs/common';
import {
  businessHour,
  parseWeekdayFilter,
  weekdayOf,
  dayGroupOf,
  parseBusinessDate,
  parseDateRange,
  shiftBusinessDate,
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

  it('shiftBusinessDate atravessa mês e ano', () => {
    expect(shiftBusinessDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftBusinessDate('2026-12-30', 3)).toBe('2027-01-02');
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

describe('weekdayOf', () => {
  it('dia da semana da data de negócio (0 = domingo), sem depender do fuso', () => {
    expect(weekdayOf('2026-09-22')).toBe(2);
    expect(weekdayOf('2026-09-27')).toBe(0);
  });
});

describe('parseWeekdayFilter', () => {
  it('ausente ou vazio = todos os dias; 0 a 6 viram número', () => {
    expect(parseWeekdayFilter(undefined)).toBeNull();
    expect(parseWeekdayFilter('')).toBeNull();
    expect(parseWeekdayFilter('0')).toBe(0);
    expect(parseWeekdayFilter('4')).toBe(4);
  });

  it('fora de 0 a 6 é recusado citando o valor', () => {
    expect(() => parseWeekdayFilter('7')).toThrow(
      /recebido "7".*0 \(domingo\) a 6/,
    );
    expect(() => parseWeekdayFilter('qui')).toThrow(BadRequestException);
  });
});

describe('businessHour', () => {
  it('hora no fuso da lanchonete, não no do servidor (UTC)', () => {
    expect(
      businessHour(new Date('2026-10-10T08:30:00Z'), 'America/Sao_Paulo'),
    ).toBe(5);
    expect(
      businessHour(new Date('2026-10-10T03:00:00Z'), 'America/Sao_Paulo'),
    ).toBe(0);
  });
});
