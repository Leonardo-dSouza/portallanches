import { UnprocessableEntityException } from '@nestjs/common';
import { assertAddonsAllowed } from './order-addons.js';
import type { OrderItemInput } from './order-item-input.js';
import type { OrderEntry, SaleProduct } from './order-pricing.js';

const product = (overrides: Partial<SaleProduct>): SaleProduct => ({
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
  components: [],
  ...overrides,
});

const X_SALADA = product({});
const BACON = product({
  id: 33,
  name: 'Add bacon',
  menuNumber: null,
  categoryId: 3,
  categoryName: 'Adicionais',
  categorySortOrder: 3,
  addonCategoryId: null,
});
const GRANOLA = product({
  id: 81,
  name: 'Granola',
  menuNumber: null,
  categoryId: 8,
  categoryName: 'Adicionais do açaí',
  categorySortOrder: 9,
  addonCategoryId: null,
});
const COCA = product({
  id: 60,
  name: 'Coca lata',
  menuNumber: null,
  categoryId: 4,
  categoryName: 'Refrigerantes',
  categorySortOrder: 4,
  addonCategoryId: null,
});
const COMBO = product({
  id: 126,
  name: 'Combo',
  isBundle: true,
  categoryId: 3,
});

const products = new Map(
  [X_SALADA, BACON, GRANOLA, COCA, COMBO].map((p) => [p.id, p]),
);

const withAddon = (parentId: number, addonId: number): OrderItemInput[] => [
  {
    productId: parentId,
    quantity: 1,
    note: null,
    addons: [{ productId: addonId, quantity: 1 }],
  },
];

describe('assertAddonsAllowed', () => {
  it('aceita o adicional da categoria de adicionais do item', () => {
    expect(() =>
      assertAddonsAllowed(withAddon(9, 33), products, []),
    ).not.toThrow();
  });

  it('recusa adicional de outra categoria citando os nomes', () => {
    expect(() => assertAddonsAllowed(withAddon(9, 81), products, [])).toThrow(
      /"Granola" não é adicional de "X Salada"/,
    );
  });

  it('recusa adicional em item que não aceita adicionais', () => {
    expect(() => assertAddonsAllowed(withAddon(60, 33), products, [])).toThrow(
      /"Coca lata" não aceita adicionais/,
    );
  });

  it('combo não entra como adicional', () => {
    expect(() => assertAddonsAllowed(withAddon(9, 126), products, [])).toThrow(
      UnprocessableEntityException,
    );
  });

  it('par que já estava no pedido passa (a configuração pode ter mudado depois)', () => {
    const previous: OrderEntry[] = [
      {
        productId: 60,
        productName: 'Coca lata',
        menuNumber: null,
        categoryName: 'Refrigerantes',
        quantity: 1,
        unitPrice: '6.00',
        unitCmv: null,
        cmvComplete: false,
        note: null,
        addons: [
          {
            productId: 33,
            productName: 'Add bacon',
            menuNumber: null,
            categoryName: 'Adicionais',
            quantity: 1,
            unitPrice: '6.00',
            unitCmv: null,
            cmvComplete: false,
          },
        ],
      },
    ];
    expect(() =>
      assertAddonsAllowed(withAddon(60, 33), products, previous),
    ).not.toThrow();
  });
});
