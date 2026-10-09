import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  orderAmount,
  priceOrderLines,
  type OrderLine,
  type SaleProduct,
} from './order-pricing.js';

const X_SALADA: SaleProduct = {
  id: 9,
  name: 'X Salada',
  menuNumber: 9,
  categoryName: 'Tradicional',
  salePrice: '17.80',
  active: true,
  components: [
    { supplyId: 4, quantity: '0.036', unitCost: '39.9', deductOnSale: false },
    { supplyId: 7, quantity: '1', unitCost: '1', deductOnSale: false },
  ],
};
const COCA: SaleProduct = {
  id: 60,
  name: 'Coca Cola 600ml',
  menuNumber: null,
  categoryName: 'Refrigerantes',
  salePrice: '7.00',
  active: true,
  components: [
    { supplyId: 30, quantity: '1', unitCost: null, deductOnSale: true },
  ],
};
const ACAI: SaleProduct = {
  id: 80,
  name: 'Açaí 500ml',
  menuNumber: null,
  categoryName: 'Açaí',
  salePrice: '12.50',
  active: true,
  components: [],
};

const catalog = (...products: SaleProduct[]) =>
  new Map(products.map((p) => [p.id, p]));

describe('priceOrderLines', () => {
  it('usa o preço do cadastro e copia nome, número, categoria e CMV', () => {
    const lines = priceOrderLines(
      [{ productId: 9, quantity: 2 }],
      catalog(X_SALADA),
      [],
    );
    expect(lines).toEqual([
      {
        productId: 9,
        productName: 'X Salada',
        menuNumber: 9,
        categoryName: 'Tradicional',
        quantity: 2,
        unitPrice: '17.80',
        unitCmv: '2.44',
        cmvComplete: true,
      },
    ]);
  });

  it('CMV incompleto (insumo sem custo) e produto sem composição', () => {
    const lines = priceOrderLines(
      [
        { productId: 60, quantity: 1 },
        { productId: 80, quantity: 1 },
      ],
      catalog(COCA, ACAI),
      [],
    );
    expect(lines.map((l) => [l.unitCmv, l.cmvComplete])).toEqual([
      ['0.00', false],
      [null, false],
    ]);
  });

  it('na edição, a linha que já existia mantém preço e CMV da época', () => {
    const before: OrderLine = {
      productId: 9,
      productName: 'X Salada',
      menuNumber: 9,
      categoryName: 'Tradicional',
      quantity: 1,
      unitPrice: '15.00',
      unitCmv: '2.00',
      cmvComplete: true,
    };
    const lines = priceOrderLines(
      [
        { productId: 9, quantity: 3 },
        { productId: 60, quantity: 1 },
      ],
      catalog({ ...X_SALADA, active: false }, COCA),
      [before],
    );
    expect(lines[0]).toEqual({ ...before, quantity: 3 });
    expect(lines[1]).toMatchObject({ productId: 60, unitPrice: '7.00' });
  });

  it('recusa produto inexistente (400), inativo ou sem preço (422) citando o nome', () => {
    const price = (product: SaleProduct | null) =>
      priceOrderLines(
        [{ productId: 9, quantity: 1 }],
        product ? catalog(product) : catalog(),
        [],
      );
    expect(() => price(null)).toThrow(BadRequestException);
    expect(() => price({ ...X_SALADA, active: false })).toThrow(
      UnprocessableEntityException,
    );
    expect(() => price({ ...X_SALADA, salePrice: null })).toThrow(
      /X Salada.*sem preço/,
    );
  });
});

describe('orderAmount', () => {
  it('soma os itens e a taxa de entrega em centavos', () => {
    const lines = priceOrderLines(
      [
        { productId: 9, quantity: 3 },
        { productId: 60, quantity: 1 },
      ],
      catalog(X_SALADA, COCA),
      [],
    );
    // 3 × 17,80 + 7,00 + taxa 4,50 (sem erro de float: 53,40 + 7 + 4,5).
    expect(orderAmount(lines, '4.50')).toBe('64.90');
    expect(orderAmount(lines, '0.00')).toBe('60.40');
  });
});
