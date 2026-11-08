import { describe, expect, it } from 'vitest';
import {
  formatAdjustedQuantity,
  formatMovementDateTime,
  formatMovementQuantity,
} from './movement-format';

describe('movement-format', () => {
  it('formata data e hora no horário de Brasília', () => {
    // 20h15 UTC vira 17h15 no Brasil (fuso -3):
    expect(formatMovementDateTime('2026-11-05T20:15:00.000Z')).toBe(
      '05/11/2026 17:15',
    );
  });

  it('formata quantidade com sinal explícito e vírgula', () => {
    expect(formatMovementQuantity('10')).toBe('+10');
    expect(formatMovementQuantity('-2.5')).toBe('-2,5');
    expect(formatMovementQuantity('0')).toBe('0');
  });

  it('formata ajuste de contagem', () => {
    expect(formatAdjustedQuantity('-1.5')).toBe('-1,5');
    expect(formatAdjustedQuantity('2')).toBe('+2');
    expect(formatAdjustedQuantity('0')).toBe('0');
  });
});
