import { BadRequestException } from '@nestjs/common';
import { parsePercent } from './percent.js';

describe('parsePercent', () => {
  it('normaliza percentuais válidos entre 0 e 100 com até 2 casas', () => {
    expect(parsePercent('41.07', 'fixedCostPercent')).toBe('41.07');
    expect(parsePercent(16, 'profitPercent')).toBe('16');
    expect(parsePercent('16.00', 'profitPercent')).toBe('16');
    expect(parsePercent('0', 'margin')).toBe('0');
    expect(parsePercent(100, 'margin')).toBe('100');
    expect(parsePercent('28.5', 'commission')).toBe('28.5');
  });

  it.each([
    -0.01,
    '-1',
    100.01,
    '101',
    '12.345',
    '12,50',
    'abc',
    null,
    undefined,
    {},
  ])('rejeita valor inválido %j', (invalid) => {
    expect(() => parsePercent(invalid, 'profitPercent')).toThrow(
      BadRequestException,
    );
  });
});
