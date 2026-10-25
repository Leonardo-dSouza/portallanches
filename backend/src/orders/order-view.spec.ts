import type { OrderEntry, OrderLine } from './order-pricing.js';
import { entryViews } from './order-view.js';

const line = (productName: string): OrderLine => ({
  productId: 1,
  productName,
  menuNumber: null,
  categoryName: 'Tradicional',
  quantity: 1,
  unitPrice: '20.00',
  unitCmv: '8.10',
  cmvComplete: true,
});

describe('entryViews', () => {
  it('tira o CMV do item e dos adicionais e mantém o resto', () => {
    const entry: OrderEntry = {
      ...line('X Salada'),
      note: 'sem tomate',
      addons: [line('Add bacon')],
    };
    const [view] = entryViews([entry]);
    expect(view).toEqual({
      productId: 1,
      productName: 'X Salada',
      menuNumber: null,
      categoryName: 'Tradicional',
      quantity: 1,
      unitPrice: '20.00',
      note: 'sem tomate',
      addons: [
        {
          productId: 1,
          productName: 'Add bacon',
          menuNumber: null,
          categoryName: 'Tradicional',
          quantity: 1,
          unitPrice: '20.00',
        },
      ],
    });
  });
});
