import type { Product } from '../api/types';
import {
  buildProductInput,
  EMPTY_PRODUCT_FORM,
  productFormValuesOf,
  productInputOf,
  type ProductFormValues,
} from './product-form-values';

const form = (overrides: Partial<ProductFormValues>): ProductFormValues => ({
  ...EMPTY_PRODUCT_FORM,
  categoryId: '1',
  name: 'X Salada',
  ...overrides,
});

const X_SALADA: Product = {
  id: 5,
  categoryId: 1,
  menuNumber: 9,
  categoryName: 'Tradicional',
  name: 'X Salada',
  description: 'Pão, hambúrguer e queijo',
  salePrice: '17.80',
  profitPercent: null,
  active: true,
  components: [
    {
      supplyId: 4,
      supplyName: 'Queijo bandeja',
      countUnit: 'kg',
      unitCost: '39.9',
      quantity: '0.036',
    },
  ],
  bundleItems: [],
  cmv: '1.44',
  cmvComplete: true,
  cmvPercent: '8.1',
};

const COMBO: Product = {
  ...X_SALADA,
  id: 9,
  menuNumber: null,
  name: 'Combo X Salada + Guaraná',
  description: null,
  salePrice: '19.00',
  components: [],
  bundleItems: [
    { productId: 5, productName: 'X Salada', quantity: 1, addon: false },
    { productId: 60, productName: 'Guaraná lata', quantity: 1, addon: false },
  ],
};

describe('buildProductInput', () => {
  it('monta o corpo com preço no formato da API e sem components', () => {
    const result = buildProductInput(
      form({
        name: ' X Salada ',
        salePrice: '17,8',
        description: ' Pão e queijo ',
      }),
      true,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        categoryId: 1,
        menuNumber: null,
        name: 'X Salada',
        description: 'Pão e queijo',
        salePrice: '17.80',
        profitPercent: null,
        active: true,
        bundleItems: [],
      },
    });
    if (result.ok) {
      expect('components' in result.value).toBe(false);
    }
  });

  it('combo manda os itens, sem número (mesmo se digitado antes)', () => {
    const built = buildProductInput(
      form({
        isCombo: true,
        menuNumber: '40',
        salePrice: '19',
        bundleItems: [{ productId: '5', quantity: '1' }],
      }),
      true,
    );
    expect(built).toMatchObject({
      ok: true,
      value: {
        menuNumber: null,
        bundleItems: [{ productId: 5, quantity: 1 }],
      },
    });
    if (built.ok) {
      expect('components' in built.value).toBe(false);
    }
  });

  it('lê o número do cardápio', () => {
    expect(buildProductInput(form({ menuNumber: ' 9 ' }), true)).toMatchObject({
      value: { menuNumber: 9 },
    });
  });

  it('preço e descrição em branco viram null', () => {
    expect(buildProductInput(form({}), false)).toMatchObject({
      value: { salePrice: null, description: null, active: false },
    });
  });

  it('meta de lucro própria: número vai como percentual da API, vazio é null', () => {
    expect(
      buildProductInput(form({ profitPercent: '10' }), true),
    ).toMatchObject({
      value: { profitPercent: '10' },
    });
    expect(
      buildProductInput(form({ profitPercent: '12,5' }), true),
    ).toMatchObject({
      value: { profitPercent: '12.5' },
    });
    expect(buildProductInput(form({ profitPercent: ' ' }), true)).toMatchObject(
      {
        value: { profitPercent: null },
      },
    );
  });

  it('combo não leva meta própria', () => {
    const built = buildProductInput(
      form({
        isCombo: true,
        profitPercent: '10',
        bundleItems: [{ productId: '5', quantity: '1' }],
      }),
      true,
    );
    expect(built).toMatchObject({ value: { profitPercent: null } });
  });

  it.each([
    [{ categoryId: '' }, /Escolha a categoria/],
    [{ menuNumber: '9a' }, /Número do cardápio inválido "9a"/],
    [{ menuNumber: '0' }, /Número do cardápio inválido "0"/],
    [{ name: ' ' }, /Informe o nome do item/],
    [{ salePrice: 'R$ 17' }, /Preço inválido "R\$ 17"/],
    [{ description: 'x'.repeat(301) }, /passa de 300 caracteres/],
    [{ profitPercent: '120' }, /Percentual da meta de lucro inválido "120"/],
    [{ profitPercent: 'dez' }, /Percentual da meta de lucro inválido "dez"/],
  ])('rejeita %j', (override, message) => {
    const result = buildProductInput(form(override), true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });
});

describe('productFormValuesOf', () => {
  it('abre o produto para edição com vírgula decimal', () => {
    expect(productFormValuesOf(X_SALADA)).toEqual({
      categoryId: '1',
      menuNumber: '9',
      name: 'X Salada',
      salePrice: '17,80',
      profitPercent: '',
      description: 'Pão, hambúrguer e queijo',
      isCombo: false,
      bundleItems: [],
    });
  });

  it('abre a meta própria com vírgula decimal', () => {
    const values = productFormValuesOf({ ...X_SALADA, profitPercent: '12.5' });
    expect(values.profitPercent).toBe('12,5');
  });

  it('abre o combo com os itens', () => {
    expect(productFormValuesOf(COMBO)).toMatchObject({
      isCombo: true,
      bundleItems: [
        { productId: '5', quantity: '1' },
        { productId: '60', quantity: '1' },
      ],
    });
  });
});

describe('productInputOf', () => {
  it('devolve o produto no formato de gravação sem components', () => {
    const input = productInputOf(X_SALADA);
    expect(input).toEqual({
      categoryId: 1,
      menuNumber: 9,
      name: 'X Salada',
      description: 'Pão, hambúrguer e queijo',
      salePrice: '17.80',
      profitPercent: null,
      active: true,
      bundleItems: [],
    });
    expect('components' in input).toBe(false);
  });

  it('combo volta com os itens (ativar/desativar não apaga o combo)', () => {
    expect(productInputOf(COMBO).bundleItems).toEqual([
      { productId: 5, quantity: 1 },
      { productId: 60, quantity: 1 },
    ]);
  });
});
