import {
  parseCategoryInput,
  parseCategoryOrder,
} from './product-category-input.js';

describe('parseCategoryInput', () => {
  it('apara o nome e lê o ativo', () => {
    expect(parseCategoryInput({ name: ' Combos ', active: true })).toEqual({
      name: 'Combos',
      active: true,
    });
  });

  it('sem active no corpo a categoria nasce ativa', () => {
    expect(parseCategoryInput({ name: 'Porções' }).active).toBe(true);
  });

  it('rejeita nome vazio citando o valor', () => {
    expect(() => parseCategoryInput({ name: '  ' })).toThrow(/"name"/);
  });
});

describe('parseCategoryOrder', () => {
  it('lê a lista de ids na ordem nova', () => {
    expect(parseCategoryOrder({ ids: [3, 1, 2] })).toEqual([3, 1, 2]);
  });

  it('rejeita lista vazia, id inválido e id repetido', () => {
    expect(() => parseCategoryOrder({ ids: [] })).toThrow(/"ids"/);
    expect(() => parseCategoryOrder({ ids: [1, 'x'] })).toThrow(/"ids\[1\]"/);
    expect(() => parseCategoryOrder({ ids: [1, 2, 1] })).toThrow(/repetido: 1/);
  });
});
