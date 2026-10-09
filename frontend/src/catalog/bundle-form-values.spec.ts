import type { Product } from '../api/types';
import {
  bundleItemOptions,
  bundleSummary,
  parseBundleRows,
} from './bundle-form-values';

const product = (id: number, overrides: Partial<Product> = {}): Product => ({
  id,
  name: `Item ${id}`,
  categoryId: 1,
  categoryName: 'Tradicional',
  menuNumber: null,
  salePrice: '10.00',
  active: true,
  description: null,
  components: [],
  bundleItems: [],
  cmv: '0.00',
  cmvComplete: true,
  cmvPercent: null,
  ...overrides,
});

describe('parseBundleRows', () => {
  it('lê produto e quantidade e ignora linha sem produto', () => {
    const rows = [
      { productId: '11', quantity: '1' },
      { productId: '60', quantity: ' 2 ' },
      { productId: '', quantity: '1' },
    ];
    expect(parseBundleRows(rows)).toEqual({
      ok: true,
      value: [
        { productId: 11, quantity: 1 },
        { productId: 60, quantity: 2 },
      ],
    });
  });

  it('combo sem item avisa', () => {
    expect(parseBundleRows([{ productId: '', quantity: '1' }])).toEqual({
      ok: false,
      error: 'Combo precisa de pelo menos um item',
    });
  });

  it('quantidade fora de 1 a 99 avisa com a linha e o valor', () => {
    const parsed = parseBundleRows([{ productId: '11', quantity: '0' }]);
    expect(parsed.ok || parsed.error).toBe(
      'Quantidade do item 1 inválida "0": esperado inteiro de 1 a 99',
    );
  });

  it('o mesmo item em duas linhas avisa', () => {
    const rows = [
      { productId: '11', quantity: '1' },
      { productId: '11', quantity: '1' },
    ];
    expect(parseBundleRows(rows).ok).toBe(false);
  });
});

describe('bundleSummary', () => {
  it('lista os itens com a quantidade', () => {
    const items = [
      { productId: 11, productName: 'X Salada', quantity: 1 },
      { productId: 60, productName: 'Guaraná lata', quantity: 2 },
    ];
    expect(bundleSummary(items)).toBe('1× X Salada + 2× Guaraná lata');
  });
});

describe('bundleItemOptions', () => {
  it('só produtos ativos que não são combos, fora o próprio', () => {
    const combo = product(3, {
      bundleItems: [{ productId: 1, productName: 'Item 1', quantity: 1 }],
    });
    const list = [product(1), product(2, { active: false }), combo, product(4)];
    expect(bundleItemOptions(list, 4).map((p) => p.id)).toEqual([1]);
  });
});
