import { BadRequestException } from '@nestjs/common';
import {
  assertOperatingDay,
  dayGroupOf,
  parseBusinessDate,
  toBusinessDate,
} from './business-date.js';

describe('business-date', () => {
  it('formata a data local com zeros à esquerda', () => {
    expect(toBusinessDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('aceita data válida', () => {
    expect(parseBusinessDate('2026-09-22')).toBe('2026-09-22');
  });

  it.each(['22/09/2026', '2026-13-01', 'abc'])('rejeita "%s"', (raw) => {
    expect(() => parseBusinessDate(raw)).toThrow(BadRequestException);
  });

  it('recusa segunda-feira citando a data', () => {
    expect(() => assertOperatingDay('2026-09-21')).toThrow(/2026-09-21/);
  });

  it('aceita terça-feira', () => {
    expect(() => assertOperatingDay('2026-09-22')).not.toThrow();
  });

  it('agrupa terça a quinta e sexta a domingo', () => {
    expect(dayGroupOf('2026-09-22')).toBe('TUE_THU');
    expect(dayGroupOf('2026-09-24')).toBe('TUE_THU');
    expect(dayGroupOf('2026-09-25')).toBe('FRI_SUN');
    expect(dayGroupOf('2026-09-27')).toBe('FRI_SUN');
  });
});
