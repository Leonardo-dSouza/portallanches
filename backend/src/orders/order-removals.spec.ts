import { UnprocessableEntityException } from '@nestjs/common';
import type { OrderItemInput } from './order-item-input.js';
import { assertRemovalsAllowed } from './order-removals.js';
import type { OrderEntry, SaleProduct } from './order-pricing.js';

const OVO = { supplyId: 40, name: 'Ovo' };

const product = (overrides: Partial<SaleProduct>): SaleProduct => ({
  id: 9,
  name: 'X Egg',
  menuNumber: 9,
  categoryId: 1,
  categoryName: 'Tradicional',
  categorySortOrder: 1,
  addonCategoryId: 3,
  isBundle: false,
  salePrice: '17.80',
  active: true,
  components: [],
  removables: [OVO],
  ...overrides,
});

const item = (
  productId: number,
  removedSupplyIds: number[],
): OrderItemInput => ({
  productId,
  quantity: 1,
  note: null,
  addons: [],
  removedSupplyIds,
});

const stored = (productId: number, supplyId: number): OrderEntry =>
  ({
    productId,
    addons: [],
    removals: [{ supplyId, supplyName: 'Tomate' }],
  }) as unknown as OrderEntry;

const check = (
  items: OrderItemInput[],
  products: SaleProduct[],
  previous: OrderEntry[] = [],
) =>
  assertRemovalsAllowed(
    items,
    new Map(products.map((p) => [p.id, p])),
    previous,
  );

describe('assertRemovalsAllowed', () => {
  it('aceita ingrediente da composição do lanche', () => {
    expect(() => check([item(9, [40])], [product({})])).not.toThrow();
  });

  it('linha sem retirada não confere nada, nem produto desconhecido', () => {
    expect(() => check([item(99, [])], [])).not.toThrow();
  });

  it('bebida (sem número no cardápio) recusa dizendo qual item', () => {
    const coca = product({ id: 60, name: 'Coca', menuNumber: null });
    expect(() => check([item(60, [40])], [coca])).toThrow(
      UnprocessableEntityException,
    );
    expect(() => check([item(60, [40])], [coca])).toThrow(
      /"Coca" não é lanche/,
    );
  });

  it('combo recusa, mesmo com número', () => {
    const combo = product({ id: 70, name: 'Combo', isBundle: true });
    expect(() => check([item(70, [40])], [combo])).toThrow(
      /"Combo" não é lanche/,
    );
  });

  it('insumo fora da lista (ou embalagem) recusa com o id', () => {
    expect(() => check([item(9, [77])], [product({})])).toThrow(
      /Insumo 77 não sai de "X Egg"/,
    );
  });

  it('retirada já gravada passa, mesmo que a receita tenha mudado depois', () => {
    expect(() =>
      check([item(9, [41])], [product({})], [stored(9, 41)]),
    ).not.toThrow();
  });
});
