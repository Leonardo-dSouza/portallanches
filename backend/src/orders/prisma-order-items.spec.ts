import type { OrderEntry, OrderLine } from './order-pricing.js';
import { nestedItemData } from './prisma-order-items.js';

const line = (productId: number, productName: string): OrderLine => ({
  productId,
  productName,
  menuNumber: null,
  categoryName: 'Tradicional',
  quantity: 1,
  unitPrice: '6.00',
  unitCmv: null,
  cmvComplete: false,
});

describe('nestedItemData', () => {
  it('põe a chave do dono no item e em cada adicional', () => {
    const entry: OrderEntry = {
      ...line(9, 'X Salada'),
      note: 'sem tomate',
      addons: [line(33, 'Add bacon')],
    };

    expect(nestedItemData(entry, { staffConsumptionId: 4 })).toEqual({
      ...line(9, 'X Salada'),
      note: 'sem tomate',
      staffConsumptionId: 4,
      addons: { create: [{ ...line(33, 'Add bacon'), staffConsumptionId: 4 }] },
    });
  });
});
