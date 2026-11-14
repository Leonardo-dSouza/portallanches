import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_IFOOD_COMMISSION_PERCENT,
  DEFAULT_IFOOD_PROFIT_PERCENT,
  parseIfoodCommissionPercent,
  parseIfoodProfitPercent,
  readIfoodSettings,
  readStoredIfoodCommissionPercent,
  readStoredIfoodProfitPercent,
} from './ifood-settings.js';

describe('ifood-settings', () => {
  it('valida e normaliza percentuais de lucro e comissão do iFood', () => {
    expect(parseIfoodProfitPercent(10)).toBe('10');
    expect(parseIfoodProfitPercent('12.5')).toBe('12.5');
    expect(parseIfoodCommissionPercent('28.00')).toBe('28');
    expect(parseIfoodCommissionPercent(30)).toBe('30');
  });

  it('rejeita valores fora de 0 a 100 ou mal formatados', () => {
    expect(() => parseIfoodProfitPercent(-1)).toThrow(BadRequestException);
    expect(() => parseIfoodProfitPercent(101)).toThrow(BadRequestException);
    expect(() => parseIfoodCommissionPercent('abc')).toThrow(
      BadRequestException,
    );
  });

  it('devolve padrão quando nulo ou corrompido no banco', () => {
    expect(readStoredIfoodProfitPercent(null)).toBe(
      DEFAULT_IFOOD_PROFIT_PERCENT,
    );
    expect(readStoredIfoodProfitPercent('invalido')).toBe(
      DEFAULT_IFOOD_PROFIT_PERCENT,
    );
    expect(readStoredIfoodProfitPercent('15')).toBe('15');

    expect(readStoredIfoodCommissionPercent(null)).toBe(
      DEFAULT_IFOOD_COMMISSION_PERCENT,
    );
    expect(readStoredIfoodCommissionPercent('corrompido')).toBe(
      DEFAULT_IFOOD_COMMISSION_PERCENT,
    );
    expect(readStoredIfoodCommissionPercent('27.5')).toBe('27.5');
  });

  it('readIfoodSettings devolve os dois percentuais com padrão quando ausentes', () => {
    expect(readIfoodSettings(null, null)).toEqual({
      profitPercent: '10',
      commissionPercent: '28',
    });
    expect(readIfoodSettings('12', '27')).toEqual({
      profitPercent: '12',
      commissionPercent: '27',
    });
  });
});
