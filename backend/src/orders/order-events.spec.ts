import { describeEntries } from './order-events.js';
import type { OrderEntry } from './order-pricing.js';

const entry = (overrides: Partial<OrderEntry>): OrderEntry => ({
  productId: 9,
  productName: 'X Salada',
  menuNumber: 9,
  categoryName: 'Tradicional',
  quantity: 2,
  unitPrice: '17.80',
  unitCmv: null,
  cmvComplete: false,
  removals: [],
  note: null,
  addons: [],
  ...overrides,
});

describe('describeEntries', () => {
  it('põe a retirada depois dos adicionais e antes da observação', () => {
    const addon = entry({ productName: 'Add bacon', quantity: 2 });
    const text = describeEntries([
      entry({
        addons: [addon],
        removals: [{ supplyId: 40, supplyName: 'Ovo' }],
        note: 'bem passado',
      }),
    ]);
    expect(text).toBe('2× X Salada (+2 Add bacon, s/ Ovo, bem passado)');
  });

  it('alface e tomate tirados saem "s/ Salada" (2026-11-08)', () => {
    const text = describeEntries([
      entry({
        quantity: 1,
        removals: [
          { supplyId: 1, supplyName: 'Alface' },
          { supplyId: 2, supplyName: 'Tomate' },
        ],
      }),
    ]);
    expect(text).toBe('1× X Salada (s/ Salada)');
  });
});
