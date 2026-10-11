import { inSortOrder, moveInSortOrder } from './sort-order';

const ITEMS = [
  { id: 1, sortOrder: 2 },
  { id: 2, sortOrder: 0 },
  { id: 3, sortOrder: 1 },
];

describe('inSortOrder', () => {
  it('ordena pelo sortOrder sem mexer na lista recebida', () => {
    expect(inSortOrder(ITEMS).map((item) => item.id)).toEqual([2, 3, 1]);
    expect(ITEMS[0].id).toBe(1);
  });
});

describe('moveInSortOrder', () => {
  it('troca com a vizinha: -1 sobe, 1 desce; todos os ids voltam', () => {
    expect(moveInSortOrder(ITEMS, 3, -1)).toEqual([3, 2, 1]);
    expect(moveInSortOrder(ITEMS, 3, 1)).toEqual([2, 1, 3]);
  });

  it('na ponta não há para onde ir', () => {
    expect(moveInSortOrder(ITEMS, 2, -1)).toBeNull();
    expect(moveInSortOrder(ITEMS, 1, 1)).toBeNull();
  });
});
