import { BadRequestException } from '@nestjs/common';
import { parseMoney } from './money.js';

describe('parseMoney', () => {
  it.each([
    [25, '25.00'],
    [25.5, '25.50'],
    ['25.5', '25.50'],
    ['007.05', '7.05'],
  ])('normaliza %s para %s', (raw, expected) => {
    expect(parseMoney(raw, 'amount', false)).toBe(expected);
  });

  it.each([-1, '1,50', '1.999', 'abc', null, undefined, 1e21])(
    'rejeita %s',
    (raw) => {
      expect(() => parseMoney(raw, 'amount', true)).toThrow(
        BadRequestException,
      );
    },
  );

  it('rejeita zero quando não permitido e cita o campo e o valor', () => {
    expect(() => parseMoney(0, 'amount', false)).toThrow(/"amount".*0/);
  });

  it('aceita zero quando permitido', () => {
    expect(parseMoney(0, 'deliveryFee', true)).toBe('0.00');
  });
});
