import { describe, expect, it } from 'vitest';
import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';
import { addonKeyLabel } from './addon-key-label';

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 1,
    name: 'Item',
    menuNumber: null,
    categoryId: 1,
    categoryName: 'Geral',
    addonCategoryId: null,
    choiceCategoryId: null,
    sortOrder: 0,
    salePrice: '10.00',
    ifoodPrice: null,
    stockLeft: null,
    removables: [],
    bundleItems: [],
    ...overrides,
  };
}

const ACAI = makeMenuItem({
  id: 10,
  name: 'Açaí 300ml',
  categoryName: 'Açaí',
  salePrice: '8.50',
  addonCategoryId: 3,
});

const MORANGO = makeMenuItem({
  id: 101,
  name: 'Morango',
  categoryId: 3,
  categoryName: 'Adicionais',
  salePrice: '5.00',
});

const COCA = makeMenuItem({
  id: 5,
  name: 'Coca Cola 600ml',
  categoryId: 4,
  categoryName: 'Refrigerantes',
  salePrice: '7.00',
});

const MENU: MenuItem[] = [ACAI, MORANGO, COCA];

function makeLine(overrides: Partial<DraftLine> = {}): DraftLine {
  return {
    id: 1,
    productId: 10,
    name: 'Açaí 300ml',
    menuNumber: null,
    categoryName: 'Açaí',
    unitPrice: '8.50',
    quantity: 1,
    note: '',
    choice: null,
    addons: [],
    removals: [],
    ...overrides,
  };
}

describe('addonKeyLabel', () => {
  it('açaí sem adicional devolve "Adicionais" com contagem 0', () => {
    const label = addonKeyLabel(makeLine(), MENU);
    expect(label).toEqual({ text: 'Adicionais', count: 0 });
  });

  it('com Morango (1) + 2 Leite Condensado devolve contagem 3', () => {
    const line = makeLine({
      addons: [
        { productId: 101, name: 'Morango', unitPrice: '5.00', quantity: 1 },
        {
          productId: 102,
          name: 'Leite Condensado',
          unitPrice: '3.50',
          quantity: 2,
        },
      ],
    });
    const label = addonKeyLabel(line, MENU);
    expect(label).toEqual({ text: 'Adicionais', count: 3 });
  });

  it('refrigerante (sem nada) devolve "Observação" com contagem 0', () => {
    const line = makeLine({
      productId: 5,
      name: 'Coca Cola 600ml',
      categoryName: 'Refrigerantes',
      unitPrice: '7.00',
    });
    const label = addonKeyLabel(line, MENU);
    expect(label).toEqual({ text: 'Observação', count: 0 });
  });
});
