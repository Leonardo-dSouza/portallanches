import { pickSaleProduct, type SaleProductCandidate } from './sale-product.js';

const candidate = (
  overrides: Partial<SaleProductCandidate>,
): SaleProductCandidate => ({
  id: 9,
  name: 'Coca Cola 2l',
  salePrice: '7.00',
  importSource: 'bebidas',
  active: true,
  quantity: '1',
  componentCount: 1,
  ...overrides,
});

describe('pickSaleProduct', () => {
  it('bebida: produto ativo com 1 un do insumo e nada mais', () => {
    expect(pickSaleProduct([candidate({})])).toEqual({
      id: 9,
      name: 'Coca Cola 2l',
      salePrice: '7.00',
      importSource: 'bebidas',
    });
  });

  it.each([
    ['lanche com vários insumos', { componentCount: 4 }],
    ['porção fracionada', { quantity: '0.036' }],
    ['produto inativo', { active: false }],
  ])('%s não conta', (_label, overrides) => {
    expect(pickSaleProduct([candidate(overrides)])).toBeNull();
  });

  it('dois produtos 1:1 é ambíguo e fica sem', () => {
    expect(pickSaleProduct([candidate({}), candidate({ id: 10 })])).toBeNull();
  });
});
