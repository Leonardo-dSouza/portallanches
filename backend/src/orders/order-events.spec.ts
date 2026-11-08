import { describeEntries, snapshotOf } from './order-events.js';
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
  choice: null,
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

  it('o pão vem primeiro, sem "+" (2026-11-08)', () => {
    const bun = entry({ productName: 'Pão Brioche', quantity: 1 });
    const bacon = entry({ productName: 'Add bacon', quantity: 1 });
    const text = describeEntries([
      entry({ quantity: 1, choice: bun, addons: [bacon] }),
    ]);
    expect(text).toBe('1× X Salada (Pão Brioche, +1 Add bacon)');
  });
});

describe('snapshotOf', () => {
  it('omite paymentParts em pedido de forma única', () => {
    const snap = snapshotOf({
      amount: '35.60',
      paymentMethodId: 1,
      paymentMode: null,
      items: [entry({})],
      paymentParts: [],
    });
    expect(snap.paymentParts).toBeUndefined();
  });

  it('grava paymentParts quando o pedido é dividido', () => {
    const parts = [
      { paymentMethodId: 1, paymentMode: null, amount: '20.00' },
      { paymentMethodId: 2, paymentMode: null, amount: '15.60' },
    ];
    const snap = snapshotOf({
      amount: '35.60',
      paymentMethodId: 1,
      paymentMode: null,
      items: [entry({})],
      paymentParts: parts,
    });
    expect(snap.paymentParts).toEqual(parts);
  });
});
