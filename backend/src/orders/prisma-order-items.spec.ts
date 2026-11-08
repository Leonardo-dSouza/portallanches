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
  removals: [],
});

describe('nestedItemData', () => {
  it('põe a chave do dono no item e em cada adicional', () => {
    const entry: OrderEntry = {
      ...line(9, 'X Salada'),
      note: 'sem tomate',
      choice: null,
      addons: [line(33, 'Add bacon')],
    };

    expect(nestedItemData(entry, { staffConsumptionId: 4 })).toEqual({
      ...line(9, 'X Salada'),
      note: 'sem tomate',
      staffConsumptionId: 4,
      addons: {
        create: [
          { ...line(33, 'Add bacon'), staffConsumptionId: 4, isChoice: false },
        ],
      },
    });
  });

  it('grava o pão como filha marcada, antes dos adicionais (2026-11-08)', () => {
    const entry: OrderEntry = {
      ...line(29, 'X Salada'),
      note: null,
      choice: line(67, 'Pão Brioche'),
      addons: [line(33, 'Add bacon')],
    };
    const children = nestedItemData(entry, { orderId: 7 }).addons.create;
    expect(children.map((c) => [c.productName, c.isChoice, c.orderId])).toEqual(
      [
        ['Pão Brioche', true, 7],
        ['Add bacon', false, 7],
      ],
    );
  });
});
