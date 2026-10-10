import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { OrderItemInput } from './order-item-input.js';
import {
  orderAmount,
  priceOrderEntries,
  type OrderEntry,
  type OrderLine,
  type SaleProduct,
} from './order-pricing.js';

/** Linha pedida sem observação; `addons` por unidade. */
const item = (
  productId: number,
  quantity: number,
  addons: OrderItemInput['addons'] = [],
  note: string | null = null,
): OrderItemInput => ({ productId, quantity, note, addons });

const X_SALADA: SaleProduct = {
  id: 9,
  name: 'X Salada',
  menuNumber: 9,
  categoryId: 1,
  categoryName: 'Tradicional',
  addonCategoryId: 3,
  isBundle: false,
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
  categoryId: 4,
  categoryName: 'Refrigerantes',
  addonCategoryId: null,
  isBundle: false,
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
  categoryId: 7,
  categoryName: 'Açaí',
  addonCategoryId: 8,
  isBundle: false,
  salePrice: '12.50',
  active: true,
  components: [],
};

const BACON: SaleProduct = {
  id: 33,
  name: 'Add bacon',
  menuNumber: null,
  categoryId: 3,
  categoryName: 'Adicionais',
  addonCategoryId: null,
  isBundle: false,
  salePrice: '6.00',
  active: true,
  components: [
    { supplyId: 12, quantity: '0.03', unitCost: '50', deductOnSale: false },
  ],
};

const catalog = (...products: SaleProduct[]) =>
  new Map(products.map((p) => [p.id, p]));

describe('priceOrderEntries', () => {
  it('usa o preço do cadastro e copia nome, número, categoria e CMV', () => {
    const lines = priceOrderEntries([item(9, 2)], catalog(X_SALADA), []);
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
        note: null,
        addons: [],
      },
    ]);
  });

  it('CMV incompleto (insumo sem custo) e produto sem composição', () => {
    const lines = priceOrderEntries(
      [item(60, 1), item(80, 1)],
      catalog(COCA, ACAI),
      [],
    );
    expect(lines.map((l) => [l.unitCmv, l.cmvComplete])).toEqual([
      ['0.00', false],
      [null, false],
    ]);
  });

  it('na edição, a linha que já existia mantém preço e CMV da época', () => {
    const before: OrderEntry = {
      productId: 9,
      productName: 'X Salada',
      menuNumber: 9,
      categoryName: 'Tradicional',
      quantity: 1,
      unitPrice: '15.00',
      unitCmv: '2.00',
      cmvComplete: true,
      note: null,
      addons: [],
    };
    const lines = priceOrderEntries(
      [item(9, 3), item(60, 1)],
      catalog({ ...X_SALADA, active: false }, COCA),
      [before],
    );
    expect(lines[0]).toEqual({ ...before, quantity: 3 });
    expect(lines[1]).toMatchObject({ productId: 60, unitPrice: '7.00' });
  });

  it('recusa produto inexistente (400), inativo ou sem preço (422) citando o nome', () => {
    const price = (product: SaleProduct | null) =>
      priceOrderEntries(
        [item(9, 1)],
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

describe('priceOrderEntries: adicionais e observação', () => {
  it('o adicional vale por unidade: 2× X Salada + bacon = 2 bacon, com preço e CMV próprios', () => {
    const [line] = priceOrderEntries(
      [item(9, 2, [{ productId: 33, quantity: 1 }], 'sem tomate')],
      catalog(X_SALADA, BACON),
      [],
    );
    expect(line.note).toBe('sem tomate');
    expect(line.addons).toEqual([
      {
        productId: 33,
        productName: 'Add bacon',
        menuNumber: null,
        categoryName: 'Adicionais',
        quantity: 2,
        unitPrice: '6.00',
        unitCmv: '1.50',
        cmvComplete: true,
      },
    ]);
  });

  it('na edição, o adicional que já estava no pedido mantém o preço da época', () => {
    const kept = priceOrderEntries(
      [item(9, 1, [{ productId: 33, quantity: 1 }])],
      catalog(X_SALADA, { ...BACON, salePrice: '5.00' }),
      [],
    );
    const edited = priceOrderEntries(
      [item(9, 1, [{ productId: 33, quantity: 2 }])],
      catalog(X_SALADA, BACON),
      kept,
    );
    expect(edited[0].addons[0]).toMatchObject({
      quantity: 2,
      unitPrice: '5.00',
    });
  });
});

describe('orderAmount', () => {
  it('soma os itens e a taxa de entrega em centavos', () => {
    const lines: OrderLine[] = priceOrderEntries(
      [item(9, 3), item(60, 1)],
      catalog(X_SALADA, COCA),
      [],
    );
    // 3 × 17,80 + 7,00 + taxa 4,50 (sem erro de float: 53,40 + 7 + 4,5).
    expect(orderAmount(lines, '4.50')).toBe('64.90');
    expect(orderAmount(lines, '0.00')).toBe('60.40');
  });
});
