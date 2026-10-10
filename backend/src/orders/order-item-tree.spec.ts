import {
  flattenEntries,
  nestItems,
  type StoredItem,
} from './order-item-tree.js';

const row = (
  id: number,
  productId: number,
  parentItemId: number | null,
  note: string | null = null,
): StoredItem => ({
  id,
  parentItemId,
  note,
  productId,
  productName: `Produto ${productId}`,
  menuNumber: null,
  categoryName: 'Tradicional',
  quantity: 1,
  unitPrice: '10.00',
  unitCmv: null,
  cmvComplete: false,
});

describe('nestItems', () => {
  it('põe cada adicional embaixo do seu item, na ordem gravada', () => {
    const entries = nestItems([
      row(1, 9, null, 'sem tomate'),
      row(2, 33, 1),
      row(3, 9, null),
      row(4, 34, 1),
    ]);
    expect(
      entries.map((e) => [
        e.productId,
        e.note,
        e.addons.map((a) => a.productId),
      ]),
    ).toEqual([
      [9, 'sem tomate', [33, 34]],
      [9, null, []],
    ]);
    expect(entries[0]).not.toHaveProperty('id');
    expect(entries[0].addons[0]).not.toHaveProperty('parentItemId');
  });
});

describe('flattenEntries', () => {
  it('linha e adicionais viram linhas soltas (para o valor e a baixa)', () => {
    const entries = nestItems([
      row(1, 9, null),
      row(2, 33, 1),
      row(3, 60, null),
    ]);
    expect(flattenEntries(entries).map((l) => l.productId)).toEqual([
      9, 33, 60,
    ]);
  });
});
