import { describe, expect, it } from 'vitest';
import type { DraftLine } from './order-lines';
import { lineWithAddonsTotal } from './addon-line-total';

function makeLine(overrides: Partial<DraftLine> = {}): DraftLine {
  return {
    id: 1,
    productId: 10,
    name: 'Açaí 300ml Puro',
    menuNumber: null,
    categoryName: 'Açaí',
    unitPrice: '8.50',
    quantity: 1,
    note: '',
    choice: null,
    addons: [
      { productId: 101, name: 'Morango', unitPrice: '5.00', quantity: 1 },
      {
        productId: 102,
        name: 'Leite Condensado',
        unitPrice: '3.50',
        quantity: 2,
      },
    ],
    removals: [],
    ...overrides,
  };
}

describe('lineWithAddonsTotal', () => {
  it('soma o preço da linha e dos adicionais em centavos', () => {
    // 8,50 + 5,00 + 2×3,50 = 20,50
    expect(lineWithAddonsTotal(makeLine())).toBe('20.50');
  });

  it('multiplica linha e adicionais pela quantidade da linha como treeOfDraft', () => {
    // (8,50 + 5,00 + 2×3,50) × 2 = 41,00
    expect(lineWithAddonsTotal(makeLine({ quantity: 2 }))).toBe('41.00');
  });
});
