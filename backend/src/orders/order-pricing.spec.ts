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
  removedSupplyIds: number[] = [],
): OrderItemInput => ({ productId, quantity, note, addons, removedSupplyIds });

const X_SALADA: SaleProduct = {
  id: 9,
  name: 'X Salada',
  menuNumber: 9,
  categoryId: 1,
  categoryName: 'Tradicional',
  categorySortOrder: 1,
  addonCategoryId: 3,
  isBundle: false,
  salePrice: '17.80',
  active: true,
  components: [
    { supplyId: 4, quantity: '0.036', unitCost: '39.9', deductOnSale: false },
    { supplyId: 7, quantity: '1', unitCost: '1', deductOnSale: false },
  ],
  removables: [
    { supplyId: 4, name: 'Queijo peça' },
    { supplyId: 7, name: 'Hambúrguer 56g' },
  ],
};
const COCA: SaleProduct = {
  id: 60,
  name: 'Coca Cola 600ml',
  menuNumber: null,
  categoryId: 4,
  categoryName: 'Refrigerantes',
  categorySortOrder: 4,
  addonCategoryId: null,
  isBundle: false,
  removables: [],
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
  categorySortOrder: 9,
  addonCategoryId: 8,
  isBundle: false,
  removables: [],
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
  categorySortOrder: 3,
  addonCategoryId: null,
  isBundle: false,
  removables: [],
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
        removals: [],
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
      removals: [],
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
        removals: [],
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

describe('priceOrderEntries: retirada de ingrediente', () => {
  const products = new Map([[9, X_SALADA]]);
  const withoutBurger = item(9, 1, [], null, [7]);

  it('o CMV sai sem o ingrediente, o preço fica igual e o nome vai junto', () => {
    const [entry] = priceOrderEntries([withoutBurger], products, []);
    expect(entry.unitPrice).toBe('17.80');
    expect(entry.unitCmv).toBe('1.44');
    expect(entry.removals).toEqual([
      { supplyId: 7, supplyName: 'Hambúrguer 56g' },
    ]);
  });

  it('adicional não tem retirada', () => {
    const bacon = { ...COCA, id: 33, name: 'Add bacon' };
    const [entry] = priceOrderEntries(
      [item(9, 1, [{ productId: 33, quantity: 1 }])],
      new Map([...products, [33, bacon]]),
      [],
    );
    expect(entry.addons[0].removals).toEqual([]);
  });

  it('linhas do mesmo lanche com retiradas diferentes têm CMV próprio', () => {
    const [full, reduced] = priceOrderEntries(
      [item(9, 1), withoutBurger],
      products,
      [],
    );
    expect(full.unitCmv).toBe('2.44');
    expect(reduced.unitCmv).toBe('1.44');
  });

  describe('na edição', () => {
    const saved = priceOrderEntries([withoutBurger], products, []);
    const costlier = new Map([
      [
        9,
        {
          ...X_SALADA,
          salePrice: '20.00',
          components: X_SALADA.components.map((c) => ({
            ...c,
            unitCost: '50',
          })),
        },
      ],
    ]);

    it('retirada igual guarda o preço e o CMV da época', () => {
      const [entry] = priceOrderEntries([withoutBurger], costlier, saved);
      expect(entry.unitPrice).toBe('17.80');
      expect(entry.unitCmv).toBe('1.44');
    });

    it('retirada mudada guarda o preço e recalcula o CMV com o custo de hoje', () => {
      const [entry] = priceOrderEntries(
        [item(9, 1, [], null, [4, 7])],
        costlier,
        saved,
      );
      expect(entry.unitPrice).toBe('17.80');
      expect(entry.unitCmv).toBe('0.00');
    });

    it('retirada já gravada mantém o nome, mesmo fora da receita de hoje', () => {
      const semReceita = new Map([[9, { ...X_SALADA, removables: [] }]]);
      const [entry] = priceOrderEntries([withoutBurger], semReceita, saved);
      expect(entry.removals[0].supplyName).toBe('Hambúrguer 56g');
    });
  });
});
