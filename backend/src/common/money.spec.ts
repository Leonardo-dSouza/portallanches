import { BadRequestException } from '@nestjs/common';
import { formatCents, parseMoney, toCents } from './money.js';

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

describe('toCents / formatCents', () => {
  it('converte ida e volta sem erro de ponto flutuante', () => {
    expect(toCents('0.10') + toCents('0.20')).toBe(30);
    expect(formatCents(toCents('0.10') + toCents('0.20'))).toBe('0.30');
  });

  it('formata centavos com 2 casas', () => {
    expect(formatCents(2500)).toBe('25.00');
  });
});

describe('parseMoney com teto de dígitos (S-19)', () => {
  it('8 dígitos passam; 9 ou 14 viram 400 (antes 500 no banco)', () => {
    expect(parseMoney('99999999.99', 'amount', false)).toBe('99999999.99');
    for (const raw of ['123456789', 12345678901234, '12345678901234.5'])
      expect(() => parseMoney(raw, 'amount', false)).toThrow(/até 8 dígitos/);
  });
});
