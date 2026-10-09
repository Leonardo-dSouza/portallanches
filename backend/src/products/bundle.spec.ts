import { computeCmv } from './cmv.js';
import { expandBundle, type BundleItemCost } from './bundle.js';

const X_SALADA: BundleItemCost = {
  quantity: 1,
  components: [
    { quantity: '0.036', unitCost: '39.9' },
    { quantity: '1', unitCost: '2.35' },
  ],
};
const GUARANA_LATA: BundleItemCost = {
  quantity: 2,
  components: [{ quantity: '1', unitCost: '3.1' }],
};

describe('expandBundle', () => {
  it('junta os insumos dos itens multiplicados pela quantidade de cada item', () => {
    expect(expandBundle([X_SALADA, GUARANA_LATA])).toEqual([
      { quantity: '0.036', unitCost: '39.9' },
      { quantity: '1', unitCost: '2.35' },
      { quantity: '2', unitCost: '3.1' },
    ]);
  });

  it('o CMV do combo é a soma dos CMVs dos itens', () => {
    // 0,036 × 39,90 + 2,35 + 2 × 3,10 = 9,9864 → 9,99
    expect(computeCmv(expandBundle([X_SALADA, GUARANA_LATA])).cmv).toBe('9.99');
  });

  it('item sem custo deixa o CMV do combo incompleto', () => {
    const semCusto = {
      quantity: 1,
      components: [{ quantity: '1', unitCost: null }],
    };
    expect(computeCmv(expandBundle([X_SALADA, semCusto])).complete).toBe(false);
  });
});
