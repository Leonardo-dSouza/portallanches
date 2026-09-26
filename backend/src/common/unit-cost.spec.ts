import { BadRequestException } from '@nestjs/common';
import { parseUnitCost } from './unit-cost.js';

describe('parseUnitCost', () => {
  it.each([
    ['39.90', '39.9'],
    [5.99, '5.99'],
    ['0.0833', '0.0833'],
    ['0', '0'],
    ['012.5000', '12.5'],
  ])('normaliza %j para %j', (raw, expected) => {
    expect(parseUnitCost(raw, 'unitCost')).toBe(expected);
  });

  it.each([-1, '39,90', '0.12345', 'caro', null, true])('rejeita %j', (raw) => {
    expect(() => parseUnitCost(raw, 'unitCost')).toThrow(BadRequestException);
  });

  it('cita o valor recebido e o formato esperado', () => {
    expect(() => parseUnitCost('1,5', 'unitCost')).toThrow(
      /"unitCost": recebido "1,5", esperado número não negativo com até 4 casas/,
    );
  });
});
