import type { Product, Supply } from '../api/types';
import {
  buildProductInput,
  describeCmvPercent,
  EMPTY_PRODUCT_FORM,
  productFormValuesOf,
  productInputOf,
  productSortKey,
  unitOfSupply,
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
  categoryName: 'Tradicional',
  name: 'X Salada',
  description: 'Pão, hambúrguer e queijo',
  salePrice: '17.80',
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
  cmv: '1.44',
  cmvComplete: true,
  cmvPercent: '8.1',
};

describe('buildProductInput', () => {
  it('monta o corpo com preço e quantidades no formato da API', () => {
    expect(
      buildProductInput(
        form({
          name: ' X Salada ',
          salePrice: '17,8',
          description: ' Pão e queijo ',
          components: [
            { supplyId: '4', quantity: '0,036' },
            { supplyId: '', quantity: '' },
          ],
        }),
        true,
      ),
    ).toEqual({
      ok: true,
      value: {
        categoryId: 1,
        name: 'X Salada',
        description: 'Pão e queijo',
        salePrice: '17.80',
        active: true,
        components: [{ supplyId: 4, quantity: '0.036' }],
      },
    });
  });

  it('preço e descrição em branco viram null', () => {
    expect(buildProductInput(form({}), false)).toMatchObject({
      value: { salePrice: null, description: null, active: false },
    });
  });

  it.each([
    [{ categoryId: '' }, /Escolha a categoria/],
    [{ name: ' ' }, /Informe o nome do lanche/],
    [{ salePrice: 'R$ 17' }, /Preço inválido "R\$ 17"/],
    [{ description: 'x'.repeat(301) }, /passa de 300 caracteres/],
    [{ components: [{ supplyId: '', quantity: '1' }] }, /insumo da linha 1/],
    [
      { components: [{ supplyId: '4', quantity: '0' }] },
      /linha 1 inválida "0"/,
    ],
    [
      {
        components: [
          { supplyId: '4', quantity: '1' },
          { supplyId: '4', quantity: '2' },
        ],
      },
      /mesmo insumo aparece em duas linhas/,
    ],
  ])('rejeita %j', (override, message) => {
    const result = buildProductInput(form(override), true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });
});

describe('productFormValuesOf e unitOfSupply', () => {
  it('abre o produto para edição com vírgula decimal', () => {
    expect(productFormValuesOf(X_SALADA)).toEqual({
      categoryId: '1',
      name: 'X Salada',
      salePrice: '17,80',
      description: 'Pão, hambúrguer e queijo',
      components: [{ supplyId: '4', quantity: '0,036' }],
    });
  });

  it('acha a unidade do insumo escolhido; sem escolha usa "un"', () => {
    const supplies = [{ id: 4, countUnit: 'kg' }] as Supply[];
    expect(unitOfSupply(supplies, '4')).toBe('kg');
    expect(unitOfSupply(supplies, '')).toBe('un');
  });
});

describe('productInputOf, productSortKey e describeCmvPercent', () => {
  it('devolve o produto no formato de gravação', () => {
    expect(productInputOf(X_SALADA)).toEqual({
      categoryId: 1,
      name: 'X Salada',
      description: 'Pão, hambúrguer e queijo',
      salePrice: '17.80',
      active: true,
      components: [{ supplyId: 4, quantity: '0.036' }],
    });
  });

  it('ordena pela posição da categoria e depois pelo nome', () => {
    const categories = [
      { id: 9, name: 'Tradicional', sortOrder: 1, active: true },
      { id: 3, name: 'Artesanal', sortOrder: 2, active: true },
    ];
    expect(productSortKey({ categoryId: 3, name: 'X Bacon' }, categories)).toBe(
      '02 X Bacon',
    );
  });

  it('mostra a porcentagem com vírgula', () => {
    expect(describeCmvPercent('41.7')).toBe('41,7%');
    expect(describeCmvPercent(null)).toBe('—');
  });
});
