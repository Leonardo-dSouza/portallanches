import type { Product } from '../api/types';
import {
  bundleItemOptions,
  bundleLines,
  parseBundleRows,
} from './bundle-form-values';

const product = (id: number, overrides: Partial<Product> = {}): Product => ({
  id,
  name: `Item ${id}`,
  categoryId: 1,
  categoryName: 'Tradicional',
  menuNumber: null,
  salePrice: '10.00',
  profitPercent: null,
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

describe('bundleLines', () => {
  const lanche = { name: 'X Bacon Salada', addon: false };
  const bebida = { name: 'Guaraná Antarctica Lata 350ml', addon: false };
  const cheddar = { name: 'Add Cheddar Fatia', addon: true };

  it('o adicional vai logo depois do 1º item, mesmo gravado depois da bebida (combo 154)', () => {
    expect(bundleLines([lanche, bebida, cheddar])).toEqual([
      lanche,
      cheddar,
      bebida,
    ]);
  });

  it('na ordem gravada quando já está certa, e combo só de adicionais fica como veio', () => {
    expect(bundleLines([lanche, cheddar, bebida])).toEqual([
      lanche,
      cheddar,
      bebida,
    ]);
    expect(bundleLines([cheddar])).toEqual([cheddar]);
  });
});

describe('bundleItemOptions', () => {
  it('só produtos ativos que não são combos, fora o próprio', () => {
    const combo = product(3, {
      bundleItems: [
        { productId: 1, productName: 'Item 1', quantity: 1, addon: false },
      ],
    });
    const list = [product(1), product(2, { active: false }), combo, product(4)];
    expect(bundleItemOptions(list, 4).map((p) => p.id)).toEqual([1]);
  });
});
