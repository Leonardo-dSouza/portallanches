import { rangeError } from '../history/period-range';
import { purchasesRange } from './purchases-range';

describe('purchasesRange', () => {
  it('vai de 12 meses atrás até hoje', () => {
    expect(purchasesRange(new Date(2026, 10, 14))).toEqual({
      from: '2025-11-14',
      to: '2026-11-14',
    });
  });

  it('cabe no limite de 366 dias da API, também com 29 de fevereiro no meio', () => {
    expect(rangeError(purchasesRange(new Date(2028, 2, 1)))).toBeNull();
  });
});
