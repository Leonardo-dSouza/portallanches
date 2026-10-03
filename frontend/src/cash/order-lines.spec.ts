import type { MenuItem } from './menu-lookup';
import {
  addLine,
  adjustLast,
  centsToMoney,
  changeQuantity,
  describeItems,
  lineTotal,
  linesOfOrder,
  previewTotalCents,
  type DraftLine,
} from './order-lines';

const X_SALADA: MenuItem = {
  id: 1,
  name: 'X Salada',
  menuNumber: 9,
  categoryName: 'Tradicional',
  salePrice: '17.80',
};
const COCA: MenuItem = {
  id: 5,
  name: 'Coca Cola 600ml',
  menuNumber: null,
  categoryName: 'Refrigerantes',
  salePrice: '7.00',
};

describe('addLine', () => {
  it('produto novo entra no fim; repetido soma e vai para o fim (o "+" age nele)', () => {
    let lines = addLine([], X_SALADA, 1);
    lines = addLine(lines, COCA, 1);
    lines = addLine(lines, X_SALADA, 2);
    expect(lines.map((l) => [l.productId, l.quantity])).toEqual([
      [5, 1],
      [1, 3],
    ]);
  });

  it('não passa de 99 por linha', () => {
    expect(addLine(addLine([], COCA, 98), COCA, 5)[0].quantity).toBe(99);
  });
});

describe('ajustes de quantidade', () => {
  const lines: DraftLine[] = addLine(addLine([], X_SALADA, 1), COCA, 2);

  it('"+" e "-" mexem na última linha; no zero ela sai', () => {
    expect(adjustLast(lines, 1).at(-1)?.quantity).toBe(3);
    expect(adjustLast(adjustLast(lines, -1), -1)).toHaveLength(1);
    expect(adjustLast([], 1)).toEqual([]);
  });

  it('os botões da linha mexem só nela', () => {
    expect(changeQuantity(lines, 1, 1).map((l) => l.quantity)).toEqual([2, 2]);
    expect(changeQuantity(lines, 1, -1).map((l) => l.productId)).toEqual([5]);
  });
});

describe('previewTotalCents', () => {
  it('soma em centavos inteiros, com a taxa', () => {
    const lines = addLine(addLine([], X_SALADA, 3), COCA, 1);
    expect(previewTotalCents(lines, '4.50')).toBe(6490);
    expect(previewTotalCents(lines, '')).toBe(6040);
  });
});

describe('lineTotal e centsToMoney', () => {
  it('subtotal da linha e centavos no formato da API', () => {
    expect(lineTotal(addLine([], X_SALADA, 3)[0])).toBe('53.40');
    expect(centsToMoney(6490)).toBe('64.90');
    expect(centsToMoney(5)).toBe('0.05');
  });
});

describe('linesOfOrder', () => {
  it('abre as linhas de um pedido gravado (preço da época)', () => {
    expect(
      linesOfOrder([
        {
          productId: 1,
          productName: 'X Salada',
          menuNumber: 9,
          categoryName: 'Tradicional',
          quantity: 2,
          unitPrice: '15.00',
          unitCmv: null,
          cmvComplete: false,
        },
      ]),
    ).toEqual([
      {
        productId: 1,
        name: 'X Salada',
        menuNumber: 9,
        categoryName: 'Tradicional',
        unitPrice: '15.00',
        quantity: 2,
      },
    ]);
  });
});

describe('describeItems', () => {
  it('quantidade só quando passa de 1 e artesanal marcado', () => {
    const line = (
      productName: string,
      categoryName: string,
      quantity: number,
    ) => ({
      productId: 1,
      productName,
      menuNumber: null,
      categoryName,
      quantity,
      unitPrice: '1.00',
      unitCmv: null,
      cmvComplete: false,
    });
    expect(
      describeItems([
        line('X Salada', 'Tradicional', 2),
        line('X Salada', 'Artesanal', 1),
        line('Coca Cola 600ml', 'Refrigerantes', 1),
      ]),
    ).toBe('2× X Salada, X Salada (art.), Coca Cola 600ml');
  });
});
