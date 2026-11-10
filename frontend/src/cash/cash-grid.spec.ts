import { describe, expect, it } from 'vitest';
import { cashGridClassName } from './cash-grid';

describe('cashGridClassName', () => {
  it('dia aberto: a grade de duas colunas (comanda e lista)', () => {
    expect(cashGridClassName(false)).toBe('cash-grid');
  });

  it('dia fechado: uma coluna só, o aviso em cima e a lista na largura toda', () => {
    expect(cashGridClassName(true)).toBe('cash-grid cash-grid-closed');
  });
});
