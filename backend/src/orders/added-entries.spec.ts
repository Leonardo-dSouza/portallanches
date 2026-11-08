import { describe, expect, it } from 'vitest';
import { hasAddedEntries } from './added-entries.js';
import type { OrderEntry, OrderLine } from './order-pricing.js';

function fakeEntry(
  productId: number,
  quantity: number,
  options: {
    choiceId?: number;
    addons?: { productId: number; quantity: number }[];
    removals?: number[];
    note?: string | null;
  } = {},
): OrderEntry {
  const choice: OrderLine | null = options.choiceId
    ? {
        productId: options.choiceId,
        productName: `Pão ${options.choiceId}`,
        menuNumber: null,
        categoryName: 'Pães',
        quantity,
        unitPrice: '0.00',
        unitCmv: null,
        cmvComplete: false,
        removals: [],
      }
    : null;
  const addons: OrderLine[] = (options.addons ?? []).map((addon) => ({
    productId: addon.productId,
    productName: `Adicional ${addon.productId}`,
    menuNumber: null,
    categoryName: 'Adicionais',
    quantity: addon.quantity,
    unitPrice: '5.00',
    unitCmv: null,
    cmvComplete: false,
    removals: [],
  }));
  const removals = (options.removals ?? []).map((supplyId) => ({
    supplyId,
    supplyName: `Insumo ${supplyId}`,
  }));
  return {
    productId,
    productName: `Produto ${productId}`,
    menuNumber: null,
    categoryName: 'Lanches',
    quantity,
    unitPrice: '20.00',
    unitCmv: null,
    cmvComplete: false,
    removals,
    note: options.note ?? null,
    choice,
    addons,
  };
}

describe('hasAddedEntries', () => {
  it('retorna true quando aumenta a quantidade de um item existente', () => {
    const before = [fakeEntry(1, 2)];
    const after = [fakeEntry(1, 3)];
    expect(hasAddedEntries(before, after)).toBe(true);
  });

  it('retorna true quando adiciona um produto novo', () => {
    const before = [fakeEntry(1, 2)];
    const after = [fakeEntry(1, 2), fakeEntry(2, 1)];
    expect(hasAddedEntries(before, after)).toBe(true);
  });

  it('retorna false quando as quantidades e itens são iguais', () => {
    const before = [fakeEntry(1, 2)];
    const after = [fakeEntry(1, 2)];
    expect(hasAddedEntries(before, after)).toBe(false);
  });

  it('retorna false quando diminui a quantidade', () => {
    const before = [fakeEntry(1, 2)];
    const after = [fakeEntry(1, 1)];
    expect(hasAddedEntries(before, after)).toBe(false);
  });

  it('retorna false quando remove um produto', () => {
    const before = [fakeEntry(1, 1), fakeEntry(2, 1)];
    const after = [fakeEntry(1, 1)];
    expect(hasAddedEntries(before, after)).toBe(false);
  });

  it('retorna true quando muda ou acrescenta adicionais por unidade', () => {
    const before = [
      fakeEntry(1, 1, { addons: [{ productId: 10, quantity: 1 }] }),
    ];
    const after = [
      fakeEntry(1, 1, { addons: [{ productId: 10, quantity: 2 }] }),
    ];
    expect(hasAddedEntries(before, after)).toBe(true);
  });

  it('retorna true quando troca o pão da escolha', () => {
    const before = [fakeEntry(1, 1, { choiceId: 100 })];
    const after = [fakeEntry(1, 1, { choiceId: 200 })];
    expect(hasAddedEntries(before, after)).toBe(true);
  });

  it('retorna true quando troca as retiradas', () => {
    const before = [fakeEntry(1, 1, { removals: [1] })];
    const after = [fakeEntry(1, 1, { removals: [] })];
    expect(hasAddedEntries(before, after)).toBe(true);
  });

  it('retorna true quando altera a observação', () => {
    const before = [fakeEntry(1, 1, { note: 'bem passado' })];
    const after = [fakeEntry(1, 1, { note: 'ao ponto' })];
    expect(hasAddedEntries(before, after)).toBe(true);
  });
});
