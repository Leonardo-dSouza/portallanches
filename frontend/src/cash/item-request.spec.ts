import { itemsRequestOf } from './item-request';
import type { DraftLine } from './order-lines';

const line = (id: number, fields: Partial<DraftLine> = {}): DraftLine => ({
  id,
  productId: 1,
  name: 'X Salada',
  menuNumber: 9,
  categoryName: 'Tradicional',
  unitPrice: '17.80',
  quantity: 1,
  note: '',
  addons: [],
  ...fields,
});

describe('itemsRequestOf', () => {
  it('junta as linhas idênticas e manda só produto, quantidade, observação e adicionais', () => {
    const bacon = {
      productId: 33,
      name: 'Add bacon',
      unitPrice: '6.00',
      quantity: 1,
    };
    const lines = [
      line(1),
      line(2),
      line(3, { note: 'sem tomate', addons: [bacon] }),
    ];

    expect(itemsRequestOf(lines)).toEqual([
      { productId: 1, quantity: 2 },
      {
        productId: 1,
        quantity: 1,
        note: 'sem tomate',
        addons: [{ productId: 33, quantity: 1 }],
      },
    ]);
  });
});
